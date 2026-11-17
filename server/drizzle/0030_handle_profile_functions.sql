-- Custom migration: club handles, usernames, and the profile page.
-- save_profile now saves the username (otherwise unchanged from 0022).
-- club_handle_taken and username_taken say whether a name is in use anywhere,
-- which RLS alone can't answer (other owners' rows are hidden); they return a
-- boolean only. profile_card gives the sign-in form a person's username and
-- photo by account id. my_club_history serves the profile page: the clubs the
-- caller has joined (club_members.user_id) with their sessions, players,
-- finished matches and badges, so the API can find the caller's games by the
-- name they have on each roster.

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

  insert into public.profiles (id, first_name, last_name, display_name, username, phone, city, role, terms_accepted_at, updated_at)
  values (
    v_user,
    p_profile ->> 'first_name',
    p_profile ->> 'last_name',
    p_profile ->> 'display_name',
    p_profile ->> 'username',
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

-- Whether another club already has this handle (the caller's own club, `p_club_id`, doesn't count).
create function public.club_handle_taken(p_handle text, p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clubs
    where handle = lower(p_handle) and (p_club_id is null or id <> p_club_id)
  );
$$;
--> statement-breakpoint

-- Whether another account already has this username (`p_user_id`'s own doesn't count).
create function public.username_taken(p_username text, p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where username = lower(p_username) and (p_user_id is null or id <> p_user_id)
  );
$$;
--> statement-breakpoint

-- A person's username, display name and photo, for the sign-in form after they enter their email.
create function public.profile_card(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'username', p.username,
    'display_name', p.display_name,
    'avatar_path', p.avatar_path,
    'avatar_position', p.avatar_position
  )
  from public.profiles p
  where p_user_id is not null and p.id = p_user_id;
$$;
--> statement-breakpoint

create function public.my_club_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select k.id, k.name, k.handle, k.avatar_path, k.avatar_position, m.name as member_name
    from public.club_members m
    join public.clubs k on k.id = m.club_id
    where m.user_id = (select auth.jwt() ->> 'sub')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'handle', c.handle,
    'avatar_path', c.avatar_path,
    'avatar_position', c.avatar_position,
    'member_name', c.member_name,
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'scope', b.scope,
        'conditions', b.conditions, 'icon_path', b.icon_path, 'icon_source', b.icon_source
      ) order by b.created_at)
      from public.club_badges b where b.club_id = c.id
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'ended_at', coalesce(s.ended_at, s.updated_at)))
      from public.sessions s where s.club_id = c.id and s.status = 'ended'
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'session_id', p.session_id, 'name', p.name))
      from public.session_players p
      join public.sessions s on s.id = p.session_id
      where s.club_id = c.id and s.status = 'ended'
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', mt.id, 'session_id', mt.session_id, 'court_label', mt.court_label, 'side_a', mt.side_a, 'side_b', mt.side_b,
        'started_at', mt.started_at, 'finished_at', mt.finished_at, 'games', mt.games, 'winner', mt.winner
      ))
      from public.matches mt
      join public.sessions s on s.id = mt.session_id
      where s.club_id = c.id and s.status = 'ended' and mt.finished_at is not null
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  from mine c;
$$;
--> statement-breakpoint

revoke execute on function public.club_handle_taken(text, uuid) from public;
--> statement-breakpoint
grant execute on function public.club_handle_taken(text, uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.username_taken(text, text) from public;
--> statement-breakpoint
grant execute on function public.username_taken(text, text) to anon, authenticated;
--> statement-breakpoint
revoke execute on function public.profile_card(text) from public;
--> statement-breakpoint
grant execute on function public.profile_card(text) to anon, authenticated;
--> statement-breakpoint
revoke execute on function public.my_club_history() from public;
--> statement-breakpoint
grant execute on function public.my_club_history() to authenticated;
