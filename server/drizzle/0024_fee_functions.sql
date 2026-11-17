-- Custom migration: joining fees and invoices.
-- save_session now also saves the session's fee, but only when the save
-- carries a `fee` key, so an API with fees switched off never erases one.
-- Otherwise unchanged from 0018.
-- end_session now takes the invoices the API worked out from the session's
-- fee (utils/fees/invoices.ts) and writes them in the same transaction as
-- ending the session, after its version check. Both are security invoker,
-- so RLS limits them to the caller's own sessions.

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
  -- The same for the fee, with fees switched off.
  v_fee boolean := p_session ? 'fee';
begin
  if p_expected_version is null then
    insert into public.sessions (id, sport_id, scoring, rules, matchmaking, tournament, fee)
    values (
      v_id,
      p_session ->> 'sport_id',
      p_session -> 'scoring',
      p_session -> 'rules',
      p_session ->> 'matchmaking',
      nullif(p_session -> 'tournament', 'null'::jsonb),
      nullif(p_session -> 'fee', 'null'::jsonb)
    );
    v_version := 1;
  else
    update public.sessions
    set scoring = p_session -> 'scoring',
        rules = p_session -> 'rules',
        matchmaking = p_session ->> 'matchmaking',
        tournament = case when v_tournament then nullif(p_session -> 'tournament', 'null'::jsonb) else tournament end,
        fee = case when v_fee then nullif(p_session -> 'fee', 'null'::jsonb) else fee end,
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

drop function public.end_session(uuid, integer);
--> statement-breakpoint

-- Ends a session and writes its invoices, in one transaction. A stale
-- version raises before anything is written.
create function public.end_session(p_session_id uuid, p_expected_version integer, p_invoices jsonb default '[]'::jsonb)
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

  insert into public.session_invoices (id, session_id, player_id, name, games, amount, currency)
  select i.id, p_session_id, i.player_id, i.name, i.games, i.amount, i.currency
  from jsonb_to_recordset(p_invoices) as i (id uuid, player_id uuid, name text, games integer, amount integer, currency text);
end;
$$;
--> statement-breakpoint

revoke execute on function public.end_session(uuid, integer, jsonb) from public, anon;
--> statement-breakpoint
grant execute on function public.end_session(uuid, integer, jsonb) to authenticated;
