-- Custom migration: cancelling a match.
-- Saves never delete matches, so a cancelled match would come back as "in
-- progress" on the next load. cancel_match deletes that one match (only if
-- it's still in progress) and saves the session, in one transaction with
-- save_session's version check. Security invoker, so RLS limits it to the
-- caller's own sessions.

create function public.cancel_match(
  p_session jsonb,
  p_courts jsonb,
  p_players jsonb,
  p_matches jsonb,
  p_expected_version integer,
  p_match_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.matches
  where id = p_match_id and session_id = (p_session ->> 'id')::uuid and finished_at is null;
  -- A stale version raises here, which also undoes the delete above.
  return public.save_session(p_session, p_courts, p_players, p_matches, p_expected_version);
end;
$$;
--> statement-breakpoint

revoke execute on function public.cancel_match(jsonb, jsonb, jsonb, jsonb, integer, uuid) from public;
--> statement-breakpoint
grant execute on function public.cancel_match(jsonb, jsonb, jsonb, jsonb, integer, uuid) to authenticated;
