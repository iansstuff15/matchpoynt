-- Custom migration: restarting a court's match and a whole session.
-- save_session now also saves a match's start time, so a match replayed from
-- the start (restartMatch) keeps its new clock. Otherwise unchanged from 0011.
-- restart_session starts a session over: it deletes every match of the
-- session (saves never delete matches) and saves the reset session, in one
-- transaction with save_session's version check. Security invoker, so RLS
-- limits it to the caller's own sessions.

create or replace function public.save_session(
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
  -- Saves leave the tournament (and courts' tournament flags) alone unless they carry it,
  -- so an API with tournaments switched off never erases one.
  v_tournament boolean := p_session ? 'tournament';
begin
  if p_expected_version is null then
    insert into public.sessions (id, sport_id, scoring, rules, matchmaking, tournament)
    values (
      v_id,
      p_session ->> 'sport_id',
      p_session -> 'scoring',
      p_session -> 'rules',
      p_session ->> 'matchmaking',
      nullif(p_session -> 'tournament', 'null'::jsonb)
    );
    v_version := 1;
  else
    update public.sessions
    set scoring = p_session -> 'scoring',
        rules = p_session -> 'rules',
        matchmaking = p_session ->> 'matchmaking',
        tournament = case when v_tournament then nullif(p_session -> 'tournament', 'null'::jsonb) else tournament end,
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

  insert into public.session_courts (id, session_id, label, position, status, lineup, tournament)
  select c.id, v_id, c.label, c.position, c.status, coalesce(c.lineup, '[[],[]]'::jsonb), coalesce(c.tournament, false)
  from jsonb_to_recordset(p_courts) as c (id uuid, label text, position integer, status text, lineup jsonb, tournament boolean)
  on conflict (id) do update
    set label = excluded.label, position = excluded.position, status = excluded.status, lineup = excluded.lineup,
        tournament = case when v_tournament then excluded.tournament else public.session_courts.tournament end
    where public.session_courts.session_id = v_id;

  insert into public.session_players (id, session_id, name, tier_id, games_played, rotation, queued_at, status, active, checked_in_at)
  select p.id, v_id, p.name, p.tier_id, p.games_played, p.rotation, p.queued_at, p.status, p.active, p.checked_in_at
  from jsonb_to_recordset(p_players) as p (
    id uuid, name text, tier_id text, games_played integer, rotation integer,
    queued_at timestamptz, status text, active boolean, checked_in_at timestamptz
  )
  on conflict (id) do update
    set name = excluded.name, tier_id = excluded.tier_id, games_played = excluded.games_played,
        rotation = excluded.rotation, queued_at = excluded.queued_at, status = excluded.status,
        active = excluded.active,
        checked_in_at = coalesce(public.session_players.checked_in_at, excluded.checked_in_at)
    where public.session_players.session_id = v_id;

  insert into public.matches (id, session_id, sport_id, court_id, court_label, side_a, side_b, started_at, finished_at, games, winner)
  select m.id, v_id, p_session ->> 'sport_id', m.court_id, m.court_label, m.side_a, m.side_b,
         m.started_at, m.finished_at, m.games, m.winner
  from jsonb_to_recordset(p_matches) as m (
    id uuid, court_id uuid, court_label text, side_a uuid[], side_b uuid[],
    started_at timestamptz, finished_at timestamptz, games jsonb, winner text
  )
  on conflict (id) do update
    set started_at = excluded.started_at, finished_at = excluded.finished_at, games = excluded.games, winner = excluded.winner
    where public.matches.session_id = v_id;

  return v_version;
end;
$$;
--> statement-breakpoint

create function public.restart_session(
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
begin
  delete from public.matches where session_id = (p_session ->> 'id')::uuid;
  -- A stale version raises here, which also undoes the delete above.
  return public.save_session(p_session, p_courts, p_players, p_matches, p_expected_version);
end;
$$;
--> statement-breakpoint

revoke execute on function public.restart_session(jsonb, jsonb, jsonb, jsonb, integer) from public;
--> statement-breakpoint
grant execute on function public.restart_session(jsonb, jsonb, jsonb, jsonb, integer) to authenticated;
