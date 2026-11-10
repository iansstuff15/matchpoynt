-- Custom migration: functions and Storage policies that name the caller now
-- read the Firebase UID from the token (`auth.jwt() ->> 'sub'`). `auth.uid()`
-- casts `sub` to uuid, which fails for a Firebase UID.

create or replace function public.save_profile(p_profile jsonb, p_sports jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt() ->> 'sub');
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

-- An invite is "for" the caller only when their token's email matches and Firebase
-- has confirmed they own it (an email link or Google does; an unconfirmed sign-up doesn't).
create or replace function public.club_invite(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'club_name', k.name,
    'club_avatar_path', k.avatar_path,
    'member_name', m.name,
    'email', i.email,
    'status', i.status,
    'for_caller', lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce((auth.jwt() ->> 'email_verified')::boolean, false),
    'accepted_by_caller', m.user_id is not null and m.user_id = (auth.jwt() ->> 'sub')
  )
  from public.club_invites i
  join public.club_members m on m.id = i.member_id
  join public.clubs k on k.id = i.club_id
  where p_token is not null and i.token = p_token;
$$;
--> statement-breakpoint

create or replace function public.accept_club_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.club_invites%rowtype;
  v_user text := (auth.jwt() ->> 'sub');
  v_club text;
begin
  select * into v_invite from public.club_invites where token = p_token for update;
  if not found or v_invite.status = 'revoked' then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
  if v_user is null
    or lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
    or not coalesce((auth.jwt() ->> 'email_verified')::boolean, false) then
    raise exception 'invite_wrong_email' using errcode = 'P0001';
  end if;
  if v_invite.status = 'accepted' then
    if not exists (select 1 from public.club_members where id = v_invite.member_id and user_id = v_user) then
      raise exception 'invite_used' using errcode = 'P0001';
    end if;
  else
    update public.club_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
    update public.club_members set user_id = v_user where id = v_invite.member_id;
  end if;
  select name into v_club from public.clubs where id = v_invite.club_id;
  return v_club;
end;
$$;
--> statement-breakpoint

drop policy "Club owners read their media" on storage.objects;
--> statement-breakpoint
drop policy "Club owners upload their media" on storage.objects;
--> statement-breakpoint
drop policy "Club owners replace their media" on storage.objects;
--> statement-breakpoint
drop policy "Club owners remove their media" on storage.objects;
--> statement-breakpoint
create policy "Club owners read their media" on storage.objects for select to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
--> statement-breakpoint
create policy "Club owners upload their media" on storage.objects for insert to authenticated
  with check (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
--> statement-breakpoint
create policy "Club owners replace their media" on storage.objects for update to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
--> statement-breakpoint
create policy "Club owners remove their media" on storage.objects for delete to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
