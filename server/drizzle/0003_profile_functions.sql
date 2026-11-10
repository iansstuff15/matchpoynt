-- Custom migration: saves a profile and its sports in one transaction.
-- Runs as the caller (security invoker), so RLS limits it to their own rows.
-- The API validates the payload first; this only persists it.
create function public.save_profile(p_profile jsonb, p_sports jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  insert into public.profiles (id, first_name, last_name, display_name, phone, city, role, terms_accepted_at, updated_at)
  values (
    v_user,
    p_profile ->> 'first_name',
    p_profile ->> 'last_name',
    p_profile ->> 'display_name',
    nullif(p_profile ->> 'phone', ''),
    nullif(p_profile ->> 'city', ''),
    p_profile ->> 'role',
    (p_profile ->> 'terms_accepted_at')::timestamptz,
    now()
  )
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        display_name = excluded.display_name,
        phone = excluded.phone,
        city = excluded.city,
        role = excluded.role,
        terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
        updated_at = now();

  delete from public.player_sports
  where user_id = v_user
    and sport_id not in (select s ->> 'sport_id' from jsonb_array_elements(p_sports) s);

  insert into public.player_sports (user_id, sport_id, tier_id)
  select v_user, s.sport_id, s.tier_id
  from jsonb_to_recordset(p_sports) as s (sport_id text, tier_id text)
  on conflict (user_id, sport_id) do update set tier_id = excluded.tier_id;
end;
$$;
--> statement-breakpoint
revoke execute on function public.save_profile(jsonb, jsonb) from public, anon;
--> statement-breakpoint
grant execute on function public.save_profile(jsonb, jsonb) to authenticated;
