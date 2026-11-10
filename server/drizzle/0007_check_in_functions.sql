-- Custom migration: check-in.
-- save_session now saves checked_in_at, but never clears or moves one that is
-- already recorded: a QR check-in can land between the API loading a session
-- and saving it, and the save must not undo it.
-- public_check_in_roster / public_check_in serve the check-in QR to signed-out
-- phones. They are security definer and scoped to the one session whose
-- check-in slug matches, and they only set checked_in_at on an active player.

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

  insert into public.session_courts (id, session_id, label, position, status, lineup)
  select c.id, v_id, c.label, c.position, c.status, coalesce(c.lineup, '[[],[]]'::jsonb)
  from jsonb_to_recordset(p_courts) as c (id uuid, label text, position integer, status text, lineup jsonb)
  on conflict (id) do update
    set label = excluded.label, position = excluded.position, status = excluded.status, lineup = excluded.lineup
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
    set finished_at = excluded.finished_at, games = excluded.games, winner = excluded.winner
    where public.matches.session_id = v_id;

  return v_version;
end;
$$;
--> statement-breakpoint

-- Who can check in from a QR link: names only, for the one session whose slug matches.
create function public.public_check_in_roster(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sport_id', s.sport_id,
    'status', s.status,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'checked_in', p.checked_in_at is not null) order by p.name)
      from public.session_players p
      where p.session_id = s.id and p.active
    ), '[]'::jsonb)
  )
  from public.sessions s
  where p_slug is not null and s.check_in_slug = p_slug;
$$;
--> statement-breakpoint

-- Checks one player in from a QR link. Records the time only; the API's engine
-- puts them in the queue (settleCheckIns) on its next load. Doesn't bump the
-- session version, so the Queue Master's next change isn't refused for it.
-- result: 'ok' | 'not_found' (no such link) | 'closed' (session ended) | 'unknown_player'
create function public.public_check_in(p_slug text, p_player_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session uuid;
  v_status text;
  v_name text;
begin
  select s.id, s.status into v_session, v_status
  from public.sessions s
  where p_slug is not null and s.check_in_slug = p_slug;

  if v_session is null then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_status <> 'active' then
    return jsonb_build_object('result', 'closed');
  end if;

  update public.session_players
  set checked_in_at = coalesce(checked_in_at, now())
  where id = p_player_id and session_id = v_session and active
  returning name into v_name;

  if v_name is null then
    return jsonb_build_object('result', 'unknown_player');
  end if;
  return jsonb_build_object('result', 'ok', 'name', v_name);
end;
$$;
--> statement-breakpoint

revoke execute on function public.public_check_in_roster(text) from public;
--> statement-breakpoint
revoke execute on function public.public_check_in(text, uuid) from public;
--> statement-breakpoint
grant execute on function public.public_check_in_roster(text) to anon, authenticated;
--> statement-breakpoint
grant execute on function public.public_check_in(text, uuid) to anon, authenticated;
--> statement-breakpoint

-- Sessions already running when check-in arrived: everyone on them counts as
-- checked in (and settled), so those boards keep matching as before.
update public.session_players p
set checked_in_at = p.queued_at
from public.sessions s
where s.id = p.session_id and s.status = 'active' and p.active and p.checked_in_at is null;
