-- Custom migration: the club on leaderboards and their images. A session's
-- leaderboard (and the share images drawn from it) shows the club that runs
-- it, by name and photo. public_session_club answers that for a published
-- link, signed out, and nothing else; player_live_session now carries the
-- club's photo too.

create function public.public_session_club(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', k.name, 'avatar_path', k.avatar_path, 'avatar_position', k.avatar_position)
  from public.sessions s
  join public.clubs k on k.id = s.club_id
  where p_slug is not null and s.public_slug = p_slug;
$$;
--> statement-breakpoint

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
  with s as (select * from public.sessions x where x.id = p_session_id and x.status = 'active' and x.club_id is not null),
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
    'matches', coalesce((select jsonb_agg(to_jsonb(mt.*)) from public.matches mt where mt.session_id = s.id), '[]'::jsonb)
  )
  from s, k
  where exists (select 1 from me) or k.owner_id = (select auth.jwt() ->> 'sub');
$$;
--> statement-breakpoint

revoke execute on function public.public_session_club(text) from public;
--> statement-breakpoint
grant execute on function public.public_session_club(text) to anon, authenticated;
