-- Custom migration: signing up for planned sessions. A plan's members either
-- ask and wait for the owner (`approval`, as before) or sign themselves up
-- (`open`), up to `max_players`. club_player_page now says which, members see
-- who's coming (plan_attendees: roster names only), and my_upcoming_plans
-- lists the plans the caller is signed up for that start soon (the in-app
-- reminder). The API checks the rules first (`signUpBlockedReason`).

create or replace function public.club_player_page(p_handle text)
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
        'requested', exists (select 1 from public.session_join_requests r where r.plan_id = p.id and r.member_id = (select id from me) and r.status = 'pending'),
        'sign_up', p.sign_up,
        'max_players', p.max_players
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
create function public.sign_up_for_plan(p_club_id uuid, p_plan_id uuid, p_going boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_plan public.planned_sessions%rowtype;
begin
  select id into v_member from public.club_members where club_id = p_club_id and user_id = (select auth.jwt() ->> 'sub') limit 1;
  if v_member is null then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;
  select * into v_plan from public.planned_sessions where id = p_plan_id and club_id = p_club_id for update;
  if v_plan.id is null or (v_plan.scheduled_for is not null and v_plan.scheduled_for < now()) then
    raise exception 'session_not_open' using errcode = 'P0001';
  end if;
  if p_going then
    if v_member = any(v_plan.member_ids) then
      return;
    end if;
    if v_plan.sign_up <> 'open' then
      raise exception 'sign_up_closed' using errcode = 'P0001';
    end if;
    if v_plan.max_players is not null and cardinality(v_plan.member_ids) >= v_plan.max_players then
      raise exception 'plan_full' using errcode = 'P0001';
    end if;
    update public.planned_sessions set member_ids = array_append(member_ids, v_member), updated_at = now() where id = p_plan_id;
  else
    update public.planned_sessions set member_ids = array_remove(member_ids, v_member), updated_at = now() where id = p_plan_id;
    delete from public.session_join_requests where plan_id = p_plan_id and member_id = v_member and status = 'pending';
  end if;
end;
$$;
--> statement-breakpoint
create function public.plan_attendees(p_club_id uuid, p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.club_members m where m.club_id = p_club_id and m.user_id = (select auth.jwt() ->> 'sub'))
      or exists (select 1 from public.clubs k where k.id = p_club_id and k.owner_id = (select auth.jwt() ->> 'sub'))
    then (
      select jsonb_build_object(
        'names', coalesce((select jsonb_agg(m.name order by lower(m.name)) from public.club_members m where m.club_id = p_club_id and m.id = any(p.member_ids)), '[]'::jsonb),
        'players', cardinality(p.member_ids),
        'max_players', p.max_players
      )
      from public.planned_sessions p
      where p.id = p_plan_id and p.club_id = p_club_id
    )
  end;
$$;
--> statement-breakpoint
create function public.my_upcoming_plans(p_hours integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'plan_id', p.id, 'title', p.title, 'sport_id', p.sport_id, 'when', p.scheduled_for,
    'club_name', k.name, 'club_handle', k.handle
  ) order by p.scheduled_for), '[]'::jsonb)
  from public.planned_sessions p
  join public.clubs k on k.id = p.club_id and k.handle is not null
  join public.club_members m on m.club_id = p.club_id and m.user_id = (select auth.jwt() ->> 'sub') and m.id = any(p.member_ids)
  where p.scheduled_for between now() and now() + make_interval(hours => greatest(least(p_hours, 168), 1));
$$;
--> statement-breakpoint
revoke execute on function public.sign_up_for_plan(uuid, uuid, boolean) from public, anon;
--> statement-breakpoint
grant execute on function public.sign_up_for_plan(uuid, uuid, boolean) to authenticated;
--> statement-breakpoint
revoke execute on function public.plan_attendees(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.plan_attendees(uuid, uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.my_upcoming_plans(integer) from public, anon;
--> statement-breakpoint
grant execute on function public.my_upcoming_plans(integer) to authenticated;
