-- Custom migration: club badges in the players' live view, and its ended screen.
-- player_live_session now also returns the club's badges and its finished
-- sessions' players and matches (as club_player_page already shows its
-- members), so the live view and its leaderboard award the club's own badges,
-- career ones included. It also answers once the session has ended (its final
-- leaderboard on the ended screen); the API shows the live view only while it
-- runs. player_ended_session gives the ended screen its title and club.

-- One running club session as its players see it: the session, its courts, roster and
-- matches (open ones, and finished ones for each player's record), plus the caller's name
-- on the club's roster. Only for the club's members and its owner; `null` otherwise.
create or replace function public.player_live_session(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.sessions x where x.id = p_session_id and x.status in ('active', 'ended') and x.club_id is not null),
  k as (select * from public.clubs c where c.id = (select club_id from s)),
  me as (
    select m.name from public.club_members m
    where m.club_id = (select id from k) and m.user_id = (select auth.jwt() ->> 'sub')
    limit 1
  )
  select jsonb_build_object(
    'session', to_jsonb(s.*) - 'public_slug' - 'check_in_slug' - 'tournament_slug',
    'club', jsonb_build_object('name', k.name, 'handle', k.handle, 'avatar_path', k.avatar_path, 'avatar_position', k.avatar_position),
    'member_name', (select name from me),
    'courts', coalesce((select jsonb_agg(to_jsonb(c.*) order by c.position) from public.session_courts c where c.session_id = s.id), '[]'::jsonb),
    'players', coalesce((select jsonb_agg(to_jsonb(p.*)) from public.session_players p where p.session_id = s.id), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(mt.*)) from public.matches mt where mt.session_id = s.id), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'scope', b.scope,
        'conditions', b.conditions, 'icon_path', b.icon_path, 'icon_source', b.icon_source
      ) order by b.created_at)
      from public.club_badges b where b.club_id = k.id
    ), '[]'::jsonb),
    'history_players', coalesce((
      select jsonb_agg(jsonb_build_object('id', sp.id, 'session_id', sp.session_id, 'name', sp.name))
      from public.session_players sp join public.sessions x on x.id = sp.session_id
      where x.club_id = k.id and x.status = 'ended'
    ), '[]'::jsonb),
    'history_matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', mt.id, 'session_id', mt.session_id, 'court_label', mt.court_label, 'side_a', mt.side_a, 'side_b', mt.side_b,
        'started_at', mt.started_at, 'finished_at', mt.finished_at, 'games', mt.games, 'winner', mt.winner
      ))
      from public.matches mt join public.sessions x on x.id = mt.session_id
      where x.club_id = k.id and x.status = 'ended' and mt.finished_at is not null
    ), '[]'::jsonb)
  )
  from s, k
  where exists (select 1 from me) or k.owner_id = (select auth.jwt() ->> 'sub');
$$;
--> statement-breakpoint

-- A club session that has ended, for its players' "Session ended" screen (where they
-- give feedback): its title, sport, club and when it ended. Only for the club's
-- members and its owner; `null` otherwise or while it's still running.
create function public.player_ended_session(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'session_id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'ended_at', s.ended_at,
    'club', jsonb_build_object('name', k.name, 'handle', k.handle)
  )
  from public.sessions s
  join public.clubs k on k.id = s.club_id
  where s.id = p_session_id and s.status = 'ended'
    and (
      k.owner_id = (select auth.jwt() ->> 'sub')
      or exists (select 1 from public.club_members m where m.club_id = k.id and m.user_id = (select auth.jwt() ->> 'sub'))
    );
$$;
--> statement-breakpoint

revoke execute on function public.player_ended_session(uuid) from public;
--> statement-breakpoint
grant execute on function public.player_ended_session(uuid) to authenticated;
