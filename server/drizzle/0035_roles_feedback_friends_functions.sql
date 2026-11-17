-- Custom migration: club teams (member roles), friends, club feedback and the
-- players' live view of a running session. These read rows RLS hides from
-- the caller (other people's profiles, a club owner's sessions), so they are
-- security definer, decide everything from the caller's token
-- (`auth.jwt() ->> 'sub'`) and return only what their screen needs.
-- Players are matched to session rosters by name, as career badges are:
-- trimmed, spaces collapsed, lower case (careerKey in utils/club/badges.ts).

-- A club's team (members with a role other than `member`) and the caller's own role.
create function public.club_team(p_club_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'my_role', (select m.role from public.club_members m where m.club_id = p_club_id and m.user_id = (select auth.jwt() ->> 'sub') limit 1),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object('name', m.name, 'role', m.role, 'username', pr.username, 'avatar_path', pr.avatar_path) order by m.role, m.name)
      from public.club_members m
      left join public.profiles pr on pr.id = m.user_id
      where m.club_id = p_club_id and m.role <> 'member'
    ), '[]'::jsonb)
  )
  where (select auth.jwt() ->> 'sub') is not null;
$$;
--> statement-breakpoint

-- Accepts a friend request sent to the caller. There is no update policy on
-- friendships, so this is the only way a request becomes a friendship.
create function public.accept_friend_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt() ->> 'sub');
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  update public.friendships set status = 'accepted', accepted_at = now()
  where id = p_id and addressee_id = v_user and status = 'pending';
  if not found then
    raise exception 'friend_request_gone' using errcode = 'P0001';
  end if;
end;
$$;
--> statement-breakpoint

-- The caller's friendships with the other person's card (username, name and photo only).
create function public.my_friends()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'status', f.status,
    'incoming', f.addressee_id = (select auth.jwt() ->> 'sub'),
    'since', coalesce(f.accepted_at, f.created_at),
    'user_id', pr.id,
    'username', pr.username,
    'display_name', pr.display_name,
    'avatar_path', pr.avatar_path,
    'avatar_position', pr.avatar_position
  )), '[]'::jsonb)
  from public.friendships f
  join public.profiles pr on pr.id = case when f.requester_id = (select auth.jwt() ->> 'sub') then f.addressee_id else f.requester_id end
  where (select auth.jwt() ->> 'sub') in (f.requester_id, f.addressee_id);
$$;
--> statement-breakpoint

-- What a member is asked for feedback: the club's form while it's on, and the club's
-- sessions that ended in the last `p_window_days` days with the caller on the roster
-- (by their name on the club's roster), each with whether they've answered.
create function public.club_feedback_prompts(p_club_id uuid, p_window_days integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select m.id, lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) as key
    from public.club_members m
    where m.club_id = p_club_id and m.user_id = (select auth.jwt() ->> 'sub')
    limit 1
  ),
  form as (select * from public.club_feedback_forms f where f.club_id = p_club_id and f.enabled)
  select jsonb_build_object(
    'form', (select jsonb_build_object('title', form.title, 'intro', form.intro, 'enabled', form.enabled, 'questions', form.questions, 'updated_at', form.updated_at) from form),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'ended_at', s.ended_at,
        'answered', exists (select 1 from public.club_feedback_responses r where r.session_id = s.id and r.user_id = (select auth.jwt() ->> 'sub'))
      ) order by s.ended_at desc)
      from public.sessions s
      where s.club_id = p_club_id and s.status = 'ended'
        and s.ended_at > now() - make_interval(days => greatest(p_window_days, 1))
        and exists (
          select 1 from public.session_players sp
          where sp.session_id = s.id and lower(regexp_replace(btrim(sp.name), '\s+', ' ', 'g')) = (select key from me)
        )
    ), '[]'::jsonb)
  )
  where exists (select 1 from me);
$$;
--> statement-breakpoint

-- Saves a member's answers about one session, once. The API has already checked the
-- answers against the form; this checks the caller may answer for that session.
create function public.submit_club_feedback(p_club_id uuid, p_session_id uuid, p_answers jsonb, p_window_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt() ->> 'sub');
  v_member public.club_members%rowtype;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into v_member from public.club_members where club_id = p_club_id and user_id = v_user limit 1;
  if not found then
    raise exception 'feedback_not_member' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.club_feedback_forms where club_id = p_club_id and enabled) then
    raise exception 'feedback_closed' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.club_id = p_club_id and s.status = 'ended'
      and s.ended_at > now() - make_interval(days => greatest(p_window_days, 1))
      and exists (
        select 1 from public.session_players sp
        where sp.session_id = s.id
          and lower(regexp_replace(btrim(sp.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v_member.name), '\s+', ' ', 'g'))
      )
  ) then
    raise exception 'feedback_not_played' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.club_feedback_responses where session_id = p_session_id and user_id = v_user) then
    raise exception 'feedback_answered' using errcode = 'P0001';
  end if;
  insert into public.club_feedback_responses (id, club_id, session_id, user_id, member_name, answers)
  values (gen_random_uuid(), p_club_id, p_session_id, v_user, v_member.name, p_answers);
end;
$$;
--> statement-breakpoint

-- Running sessions of the caller's clubs with them on the roster, newest first.
create function public.player_live_sessions()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'club_name', k.name, 'started_at', s.created_at
  ) order by s.created_at desc), '[]'::jsonb)
  from public.sessions s
  join public.clubs k on k.id = s.club_id
  where s.status = 'active'
    and exists (
      select 1 from public.club_members m
      join public.session_players sp on sp.session_id = s.id and sp.active
        and lower(regexp_replace(btrim(sp.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g'))
      where m.club_id = s.club_id and m.user_id = (select auth.jwt() ->> 'sub')
    );
$$;
--> statement-breakpoint

-- One running club session as its players see it: the session, its courts, roster and
-- matches (open ones, and finished ones for each player's record), plus the caller's name
-- on the club's roster. Only for the club's members and its owner; `null` otherwise.
create function public.player_live_session(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.sessions x where x.id = p_session_id and x.status = 'active' and x.club_id is not null),
  k as (select * from public.clubs c where c.id = (select club_id from s)),
  me as (
    select m.name from public.club_members m
    where m.club_id = (select id from k) and m.user_id = (select auth.jwt() ->> 'sub')
    limit 1
  )
  select jsonb_build_object(
    'session', to_jsonb(s.*) - 'public_slug' - 'check_in_slug' - 'tournament_slug',
    'club', jsonb_build_object('name', k.name, 'handle', k.handle),
    'member_name', (select name from me),
    'courts', coalesce((select jsonb_agg(to_jsonb(c.*) order by c.position) from public.session_courts c where c.session_id = s.id), '[]'::jsonb),
    'players', coalesce((select jsonb_agg(to_jsonb(p.*)) from public.session_players p where p.session_id = s.id), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(mt.*)) from public.matches mt where mt.session_id = s.id), '[]'::jsonb)
  )
  from s, k
  where exists (select 1 from me) or k.owner_id = (select auth.jwt() ->> 'sub');
$$;
--> statement-breakpoint

revoke execute on function public.club_team(uuid) from public;
--> statement-breakpoint
grant execute on function public.club_team(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.accept_friend_request(uuid) from public;
--> statement-breakpoint
grant execute on function public.accept_friend_request(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.my_friends() from public;
--> statement-breakpoint
grant execute on function public.my_friends() to authenticated;
--> statement-breakpoint
revoke execute on function public.club_feedback_prompts(uuid, integer) from public;
--> statement-breakpoint
grant execute on function public.club_feedback_prompts(uuid, integer) to authenticated;
--> statement-breakpoint
revoke execute on function public.submit_club_feedback(uuid, uuid, jsonb, integer) from public;
--> statement-breakpoint
grant execute on function public.submit_club_feedback(uuid, uuid, jsonb, integer) to authenticated;
--> statement-breakpoint
revoke execute on function public.player_live_sessions() from public;
--> statement-breakpoint
grant execute on function public.player_live_sessions() to authenticated;
--> statement-breakpoint
revoke execute on function public.player_live_session(uuid) from public;
--> statement-breakpoint
grant execute on function public.player_live_session(uuid) to authenticated;
