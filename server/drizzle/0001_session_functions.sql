-- Custom migration: SQL functions the schema can't express.
-- save_session / end_session persist the API's changes atomically with
-- optimistic concurrency. public_leaderboard serves published links.
-- All run as the caller (RLS applies) except public_leaderboard, which is
-- security definer and returns only the one published session's results.

-- Saves a whole session in one transaction, with optimistic concurrency.
-- p_expected_version null creates the session; otherwise the row must still
-- be at that version or the call fails with 'version_conflict'.
-- Runs as the caller, so RLS applies to every write.
create function public.save_session(
  p_session jsonb,
  p_courts jsonb,
  p_players jsonb,
  p_matches jsonb,
  p_expected_version integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (p_session ->> 'id')::uuid;
  v_version integer;
begin
  if p_expected_version is null then
    insert into public.sessions (id, sport_id, scoring, rules, matchmaking)
    values (
      v_id,
      p_session ->> 'sport_id',
      p_session -> 'scoring',
      p_session -> 'rules',
      p_session ->> 'matchmaking'
    );
    v_version := 1;
  else
    update public.sessions
    set scoring = p_session -> 'scoring',
        rules = p_session -> 'rules',
        matchmaking = p_session ->> 'matchmaking',
        version = version + 1,
        updated_at = now()
    where id = v_id and version = p_expected_version and status = 'active'
    returning version into v_version;

    if v_version is null then
      raise exception 'version_conflict' using errcode = 'P0001';
    end if;
  end if;

  delete from public.session_courts
  where session_id = v_id
    and id not in (select (c ->> 'id')::uuid from jsonb_array_elements(p_courts) c);

  insert into public.session_courts (id, session_id, label, position, status)
  select c.id, v_id, c.label, c.position, c.status
  from jsonb_to_recordset(p_courts) as c (id uuid, label text, position integer, status text)
  on conflict (id) do update
    set label = excluded.label, position = excluded.position, status = excluded.status
    where public.session_courts.session_id = v_id;

  insert into public.session_players (id, session_id, name, tier_id, games_played, rotation, queued_at, status, active)
  select p.id, v_id, p.name, p.tier_id, p.games_played, p.rotation, p.queued_at, p.status, p.active
  from jsonb_to_recordset(p_players) as p (
    id uuid, name text, tier_id text, games_played integer, rotation integer,
    queued_at timestamptz, status text, active boolean
  )
  on conflict (id) do update
    set name = excluded.name, tier_id = excluded.tier_id, games_played = excluded.games_played,
        rotation = excluded.rotation, queued_at = excluded.queued_at, status = excluded.status,
        active = excluded.active
    where public.session_players.session_id = v_id;

  insert into public.matches (id, session_id, sport_id, court_id, court_label, side_a, side_b, started_at, finished_at, games, winner)
  select m.id, v_id, p_session ->> 'sport_id', m.court_id, m.court_label, m.side_a, m.side_b,
         m.started_at, m.finished_at, m.games, m.winner
  from jsonb_to_recordset(p_matches) as m (
    id uuid, court_id uuid, court_label text, side_a uuid[], side_b uuid[],
    started_at timestamptz, finished_at timestamptz, games jsonb, winner text
  )
  on conflict (id) do update
    set finished_at = excluded.finished_at, games = excluded.games, winner = excluded.winner
    where public.matches.session_id = v_id;

  return v_version;
end;
$$;
--> statement-breakpoint

-- Ends a session if it is still at the expected version.
create function public.end_session(p_session_id uuid, p_expected_version integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.sessions
  set status = 'ended', ended_at = now(), version = version + 1, updated_at = now()
  where id = p_session_id and version = p_expected_version and status = 'active';

  if not found then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
end;
$$;
--> statement-breakpoint

revoke execute on function public.save_session(jsonb, jsonb, jsonb, jsonb, integer) from public, anon;
--> statement-breakpoint
revoke execute on function public.end_session(uuid, integer) from public, anon;
--> statement-breakpoint
grant execute on function public.save_session(jsonb, jsonb, jsonb, jsonb, integer) to authenticated;
--> statement-breakpoint
grant execute on function public.end_session(uuid, integer) to authenticated;
--> statement-breakpoint

-- Read-only leaderboard data for a published session, for anyone with the link.
-- Security definer so signed-out players can read it, but it returns only
-- names, tiers and results of the one session whose slug matches.
create function public.public_leaderboard(p_slug text)
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
    ), '[]'::jsonb)
  )
  from public.sessions s
  where p_slug is not null and s.public_slug = p_slug;
$$;
--> statement-breakpoint

revoke execute on function public.public_leaderboard(text) from public;
--> statement-breakpoint
grant execute on function public.public_leaderboard(text) to anon, authenticated;
