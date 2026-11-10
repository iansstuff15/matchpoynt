-- Custom migration: club badges on published leaderboards.
-- public_leaderboard now also returns the badges of the club that runs the
-- session. public_club_history serves what "across all club sessions" badges
-- count, for one published session only: the club's sessions, but only the
-- players whose name (trimmed, spaces collapsed, lower case) is in that
-- session, and only finished matches they played in. Other players' names
-- are never returned. The API turns it into totals (utils/club/badges.ts).

create or replace function public.public_leaderboard(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sport_id', s.sport_id,
    'status', s.status,
    'updated_at', s.updated_at,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'tier_id', p.tier_id, 'active', p.active))
      from public.session_players p
      where p.session_id = s.id
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'court_label', m.court_label, 'side_a', m.side_a, 'side_b', m.side_b,
        'started_at', m.started_at, 'finished_at', m.finished_at, 'games', m.games, 'winner', m.winner
      ) order by m.finished_at desc)
      from public.matches m
      where m.session_id = s.id and m.finished_at is not null
    ), '[]'::jsonb),
    'club_badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'scope', b.scope,
        'conditions', b.conditions, 'icon_path', b.icon_path, 'icon_source', b.icon_source
      ) order by b.created_at)
      from public.club_badges b
      where s.club_id is not null and b.club_id = s.club_id
    ), '[]'::jsonb)
  )
  from public.sessions s
  where p_slug is not null and s.public_slug = p_slug;
$$;
--> statement-breakpoint

create function public.public_club_history(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with published as (
    select s.id, s.club_id from public.sessions s
    where p_slug is not null and s.public_slug = p_slug and s.club_id is not null
  ),
  names as (
    select distinct lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) as key
    from public.session_players p join published on p.session_id = published.id
  ),
  club_players as (
    select p.id, p.session_id, lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) as key
    from public.session_players p
    join public.sessions cs on cs.id = p.session_id
    join published on cs.club_id = published.club_id
    where lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) in (select key from names)
  )
  select jsonb_build_object(
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', cp.id, 'session_id', cp.session_id, 'key', cp.key)) from club_players cp), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'session_id', m.session_id, 'side_a', m.side_a, 'side_b', m.side_b,
        'finished_at', m.finished_at, 'games', m.games, 'winner', m.winner
      ))
      from public.matches m
      join public.sessions cs on cs.id = m.session_id
      join published on cs.club_id = published.club_id
      where m.finished_at is not null
        and (m.side_a && (select array_agg(id) from club_players) or m.side_b && (select array_agg(id) from club_players))
    ), '[]'::jsonb)
  )
  from published;
$$;
--> statement-breakpoint

revoke execute on function public.public_club_history(text) from public;
--> statement-breakpoint
grant execute on function public.public_club_history(text) to anon, authenticated;
--> statement-breakpoint

-- Badge icons can be animated GIFs, stored as uploaded (or as fetched from GIPHY).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'club-media';
