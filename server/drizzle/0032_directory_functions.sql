-- Custom migration: the club directory, joining clubs and sessions, in-app
-- invites and the member search. These read other people's rows, which RLS
-- hides, so they are security definer and each returns only what its screen
-- needs, deciding everything from the caller's token (`auth.jwt() ->> 'sub'`).
-- save_profile now also keeps the display name equal to the username and
-- copies the sign-in email from the token, so owners can find people by it.

create or replace function public.save_profile(p_profile jsonb, p_sports jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt() ->> 'sub');
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  insert into public.profiles (id, first_name, last_name, display_name, username, email, phone, city, role, terms_accepted_at, updated_at)
  values (
    v_user,
    p_profile ->> 'first_name',
    p_profile ->> 'last_name',
    p_profile ->> 'username',
    p_profile ->> 'username',
    lower(auth.jwt() ->> 'email'),
    nullif(p_profile ->> 'phone', ''),
    nullif(p_profile ->> 'city', ''),
    p_profile ->> 'role',
    (p_profile ->> 'terms_accepted_at')::timestamptz,
    now()
  )
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        display_name = excluded.display_name,
        username = excluded.username,
        email = coalesce(excluded.email, public.profiles.email),
        phone = excluded.phone,
        city = excluded.city,
        role = excluded.role,
        terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
        updated_at = now();

  delete from public.player_sports
  where user_id = v_user
    and sport_id not in (select s ->> 'sport_id' from jsonb_array_elements(p_sports) s);

  insert into public.player_sports (user_id, sport_id, tier_id)
  select v_user, s.sport_id, s.tier_id
  from jsonb_to_recordset(p_sports) as s (sport_id text, tier_id text)
  on conflict (user_id, sport_id) do update set tier_id = excluded.tier_id;
end;
$$;
--> statement-breakpoint

-- Up to 5 people whose @username or email starts with, or whose name contains,
-- what was typed (the API strips LIKE wildcards). Never the caller, nor anyone
-- already a member of `p_club_id` when the caller owns it.
create function public.search_people(p_query text, p_club_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(p)::jsonb), '[]'::jsonb)
  from (
    select pr.id as user_id, pr.username, pr.display_name, pr.email, pr.avatar_path, pr.avatar_position
    from public.profiles pr
    where (select auth.jwt() ->> 'sub') is not null
      and pr.id <> (select auth.jwt() ->> 'sub')
      and pr.username is not null
      and (
        pr.username like lower(p_query) || '%'
        or pr.email like lower(p_query) || '%'
        or lower(pr.display_name) like '%' || lower(p_query) || '%'
        or lower(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')) like '%' || lower(p_query) || '%'
      )
      and not exists (
        select 1 from public.club_members m join public.clubs k on k.id = m.club_id
        where m.club_id = p_club_id and m.user_id = pr.id and k.owner_id = (select auth.jwt() ->> 'sub')
      )
    order by (pr.username = lower(p_query)) desc, (pr.username like lower(p_query) || '%') desc, pr.username
    limit 5
  ) p;
$$;
--> statement-breakpoint

-- The linked accounts of a club's members (username, photo, email), for its owner only.
create function public.club_member_cards(p_club_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id', m.id, 'username', pr.username, 'email', pr.email, 'avatar_path', pr.avatar_path
  )), '[]'::jsonb)
  from public.club_members m
  join public.clubs k on k.id = m.club_id
  join public.profiles pr on pr.id = m.user_id
  where m.club_id = p_club_id and k.owner_id = (select auth.jwt() ->> 'sub');
$$;
--> statement-breakpoint

-- Where the caller stands with a club: owner, member, requested, invited or none.
create function public.club_membership(p_club_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.clubs k where k.id = p_club_id and k.owner_id = (select auth.jwt() ->> 'sub')) then 'owner'
    when exists (select 1 from public.club_members m where m.club_id = p_club_id and m.user_id = (select auth.jwt() ->> 'sub')) then 'member'
    when exists (select 1 from public.club_invites i where i.club_id = p_club_id and i.user_id = (select auth.jwt() ->> 'sub') and i.status = 'pending') then 'invited'
    when exists (select 1 from public.club_join_requests r where r.club_id = p_club_id and r.user_id = (select auth.jwt() ->> 'sub') and r.status = 'pending') then 'requested'
    else 'none'
  end;
$$;
--> statement-breakpoint

create function public.club_card(p_club public.clubs)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_club.id,
    'name', p_club.name,
    'handle', p_club.handle,
    'description', p_club.description,
    'avatar_path', p_club.avatar_path,
    'avatar_position', p_club.avatar_position,
    'cover_path', p_club.cover_path,
    'cover_position', p_club.cover_position,
    'members', (select count(*) from public.club_members m where m.club_id = p_club.id),
    'approval', p_club.join_approval,
    'membership', public.club_membership(p_club.id)
  );
$$;
--> statement-breakpoint

-- Clubs with a handle, newest first, whose name contains or handle starts with `p_query`, a page at a time
-- (one extra, so the API knows there's more).
create function public.club_directory(p_query text, p_offset integer, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.club_card(c) order by c.created_at desc, c.id), '[]'::jsonb)
  from (
    select * from public.clubs k
    where k.handle is not null
      and (p_query = '' or lower(k.name) like '%' || lower(p_query) || '%' or k.handle like lower(p_query) || '%')
    order by k.created_at desc, k.id
    offset greatest(p_offset, 0)
    limit least(greatest(p_limit, 1), 50) + 1
  ) c;
$$;
--> statement-breakpoint

-- What a join page shows before signing in: the club's name, photos and size.
create function public.club_join_card(p_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', k.name, 'handle', k.handle, 'description', k.description,
    'avatar_path', k.avatar_path, 'avatar_position', k.avatar_position,
    'cover_path', k.cover_path, 'cover_position', k.cover_position,
    'members', (select count(*) from public.club_members m where m.club_id = k.id),
    'approval', k.join_approval
  )
  from public.clubs k
  where p_handle is not null and k.handle = lower(p_handle);
$$;
--> statement-breakpoint

-- A club's page for players: its card and links, fee, badges, upcoming and running sessions
-- (with whether the caller is in or has asked), what it shares with members (only for
-- members), and its finished sessions' players and matches for the leaderboard.
create function public.club_player_page(p_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with club as (select * from public.clubs k where p_handle is not null and k.handle = lower(p_handle)),
  me as (
    select m.id, lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) as key
    from public.club_members m join club on m.club_id = club.id
    where m.user_id = (select auth.jwt() ->> 'sub')
    limit 1
  )
  select jsonb_build_object(
    'card', public.club_card(club),
    'social_links', club.social_links,
    'fee', club.fee,
    'theme', club.theme,
    'member_id', (select id from me),
    'welcome', case when (select id from me) is not null or club.owner_id = (select auth.jwt() ->> 'sub')
      then jsonb_build_object('message', club.welcome_message, 'links', club.welcome_links) end,
    'invite_id', (select i.id from public.club_invites i where i.club_id = club.id and i.user_id = (select auth.jwt() ->> 'sub') and i.status = 'pending' limit 1),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'sport_id', p.sport_id, 'when', p.scheduled_for,
        'players', cardinality(p.member_ids),
        'joined', (select id from me) = any(p.member_ids),
        'requested', exists (select 1 from public.session_join_requests r where r.plan_id = p.id and r.member_id = (select id from me) and r.status = 'pending')
      ) order by p.scheduled_for nulls last)
      from public.planned_sessions p
      where p.club_id = club.id and (p.scheduled_for is null or p.scheduled_for > now() - interval '12 hours')
    ), '[]'::jsonb),
    'active', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'when', s.created_at,
        'players', (select count(*) from public.session_players sp where sp.session_id = s.id and sp.active),
        'joined', exists (select 1 from public.session_players sp where sp.session_id = s.id and sp.active and lower(regexp_replace(btrim(sp.name), '\s+', ' ', 'g')) = (select key from me)),
        'requested', exists (select 1 from public.session_join_requests r where r.session_id = s.id and r.member_id = (select id from me) and r.status = 'pending')
      ) order by s.created_at desc)
      from public.sessions s
      where s.club_id = club.id and s.status = 'active'
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'scope', b.scope,
        'conditions', b.conditions, 'icon_path', b.icon_path, 'icon_source', b.icon_source
      ) order by b.created_at)
      from public.club_badges b where b.club_id = club.id
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', sp.id, 'session_id', sp.session_id, 'name', sp.name))
      from public.session_players sp join public.sessions s on s.id = sp.session_id
      where s.club_id = club.id and s.status = 'ended'
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', mt.id, 'session_id', mt.session_id, 'court_label', mt.court_label, 'side_a', mt.side_a, 'side_b', mt.side_b,
        'started_at', mt.started_at, 'finished_at', mt.finished_at, 'games', mt.games, 'winner', mt.winner
      ))
      from public.matches mt join public.sessions s on s.id = mt.session_id
      where s.club_id = club.id and s.status = 'ended' and mt.finished_at is not null
    ), '[]'::jsonb)
  )
  from club;
$$;
--> statement-breakpoint

-- The caller asks to join a club. An open in-app invite is accepted; a club that joins
-- automatically adds them to its roster (named by their username, with their skill tiers)
-- at once; otherwise the request waits for the owner. Answers 'joined' or 'requested'.
create function public.request_join_club(p_club_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt() ->> 'sub');
  v_club public.clubs%rowtype;
  v_profile public.profiles%rowtype;
  v_invite public.club_invites%rowtype;
  v_member uuid;
  v_tiers jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into v_club from public.clubs where id = p_club_id;
  if not found then
    raise exception 'club_not_found' using errcode = 'P0001';
  end if;
  if v_club.owner_id = v_user or exists (select 1 from public.club_members where club_id = p_club_id and user_id = v_user) then
    return 'joined';
  end if;
  select * into v_profile from public.profiles where id = v_user;
  if not found or v_profile.username is null then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;

  select * into v_invite from public.club_invites where club_id = p_club_id and user_id = v_user and status = 'pending' order by created_at desc limit 1;
  if found then
    update public.club_members set user_id = v_user where id = v_invite.member_id;
    update public.club_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
    return 'joined';
  end if;

  if exists (select 1 from public.club_join_requests where club_id = p_club_id and user_id = v_user and status = 'pending') then
    return 'requested';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('sportId', s.sport_id, 'tierId', s.tier_id)), '[]'::jsonb) into v_tiers
  from public.player_sports s where s.user_id = v_user;

  if v_club.join_approval = 'auto' then
    v_member := gen_random_uuid();
    insert into public.club_members (id, club_id, name, email, user_id) values (v_member, p_club_id, v_profile.username, v_profile.email, v_user);
    insert into public.club_member_sports (member_id, sport_id, tier_id)
    select v_member, s.sport_id, s.tier_id from public.player_sports s where s.user_id = v_user;
    insert into public.club_join_requests (id, club_id, user_id, name, tiers, avatar_path, status, decided_at)
    values (gen_random_uuid(), p_club_id, v_user, v_profile.username, v_tiers, v_profile.avatar_path, 'approved', now());
    return 'joined';
  end if;

  insert into public.club_join_requests (id, club_id, user_id, name, tiers, avatar_path) values (gen_random_uuid(), p_club_id, v_user, v_profile.username, v_tiers, v_profile.avatar_path);
  return 'requested';
end;
$$;
--> statement-breakpoint

-- A member asks to join one of the club's planned sessions, or one running now. The owner decides.
create function public.request_join_session(p_club_id uuid, p_plan_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
begin
  select id into v_member from public.club_members where club_id = p_club_id and user_id = (select auth.jwt() ->> 'sub') limit 1;
  if v_member is null then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;
  if (p_plan_id is null) = (p_session_id is null) then
    raise exception 'session_not_open' using errcode = 'P0001';
  end if;
  if p_plan_id is not null and not exists (select 1 from public.planned_sessions where id = p_plan_id and club_id = p_club_id) then
    raise exception 'session_not_open' using errcode = 'P0001';
  end if;
  if p_session_id is not null and not exists (select 1 from public.sessions where id = p_session_id and club_id = p_club_id and status = 'active') then
    raise exception 'session_not_open' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.session_join_requests
    where member_id = v_member and status = 'pending' and (plan_id = p_plan_id or session_id = p_session_id)
  ) then
    return;
  end if;
  insert into public.session_join_requests (id, club_id, member_id, plan_id, session_id)
  values (gen_random_uuid(), p_club_id, v_member, p_plan_id, p_session_id);
end;
$$;
--> statement-breakpoint

-- In-app invites waiting for the caller, with each club's card.
create function public.my_club_invites()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'sent_at', i.created_at, 'club', public.club_card(k)) order by i.created_at desc), '[]'::jsonb)
  from public.club_invites i join public.clubs k on k.id = i.club_id
  where i.user_id = (select auth.jwt() ->> 'sub') and i.status = 'pending';
$$;
--> statement-breakpoint

-- The caller accepts (linking their account to the member) or declines an in-app invite.
create function public.respond_club_invite(p_invite_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.club_invites%rowtype;
begin
  select * into v_invite from public.club_invites
  where id = p_invite_id and user_id = (select auth.jwt() ->> 'sub') and status = 'pending';
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
  if p_accept then
    update public.club_members set user_id = v_invite.user_id where id = v_invite.member_id;
    update public.club_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
    return 'accepted';
  end if;
  update public.club_invites set status = 'revoked' where id = v_invite.id;
  return 'declined';
end;
$$;
--> statement-breakpoint

revoke execute on function public.search_people(text, uuid) from public;
--> statement-breakpoint
grant execute on function public.search_people(text, uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.club_member_cards(uuid) from public;
--> statement-breakpoint
grant execute on function public.club_member_cards(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.club_membership(uuid) from public;
--> statement-breakpoint
grant execute on function public.club_membership(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.club_card(public.clubs) from public;
--> statement-breakpoint
grant execute on function public.club_card(public.clubs) to authenticated;
--> statement-breakpoint
revoke execute on function public.club_directory(text, integer, integer) from public;
--> statement-breakpoint
grant execute on function public.club_directory(text, integer, integer) to authenticated;
--> statement-breakpoint
revoke execute on function public.club_join_card(text) from public;
--> statement-breakpoint
grant execute on function public.club_join_card(text) to anon, authenticated;
--> statement-breakpoint
revoke execute on function public.club_player_page(text) from public;
--> statement-breakpoint
grant execute on function public.club_player_page(text) to authenticated;
--> statement-breakpoint
revoke execute on function public.request_join_club(uuid) from public;
--> statement-breakpoint
grant execute on function public.request_join_club(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.request_join_session(uuid, uuid, uuid) from public;
--> statement-breakpoint
grant execute on function public.request_join_session(uuid, uuid, uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.my_club_invites() from public;
--> statement-breakpoint
grant execute on function public.my_club_invites() to authenticated;
--> statement-breakpoint
revoke execute on function public.respond_club_invite(uuid, boolean) from public;
--> statement-breakpoint
grant execute on function public.respond_club_invite(uuid, boolean) to authenticated;
