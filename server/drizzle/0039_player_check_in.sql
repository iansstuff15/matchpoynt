-- Custom migration: players check themselves in from the app.
-- A member on a running club session's roster (matched by their name on the
-- club's roster, as the live view matches them) records their own check-in,
-- as scanning the session's QR does: only `checked_in_at` is set (kept if
-- already set) and the version isn't bumped; the engine's settleCheckIns puts
-- them into the queue on the next load. Answers 'checked_in', 'not_on_roster'
-- or 'closed'.

create function public.player_check_in(p_session_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_club uuid;
  v_status text;
  v_member text;
  v_player uuid;
begin
  select s.club_id, s.status into v_club, v_status
  from public.sessions s
  where s.id = p_session_id and s.club_id is not null;
  if v_club is null then
    return 'not_on_roster';
  end if;
  if v_status <> 'active' then
    return 'closed';
  end if;

  select m.name into v_member
  from public.club_members m
  where m.club_id = v_club and m.user_id = (select auth.jwt() ->> 'sub')
  limit 1;
  if v_member is null then
    return 'not_on_roster';
  end if;

  -- One player: the first active one with their name, as the live view finds them.
  update public.session_players p
  set checked_in_at = coalesce(p.checked_in_at, now())
  where p.id = (
    select x.id from public.session_players x
    where x.session_id = p_session_id and x.active
      and lower(regexp_replace(btrim(x.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v_member), '\s+', ' ', 'g'))
    order by x.queued_at
    limit 1
  )
  returning p.id into v_player;
  if v_player is null then
    return 'not_on_roster';
  end if;
  return 'checked_in';
end;
$$;
--> statement-breakpoint
revoke execute on function public.player_check_in(uuid) from public;
--> statement-breakpoint
grant execute on function public.player_check_in(uuid) to authenticated;
