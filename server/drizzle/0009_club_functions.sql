-- Custom migration: club manager.
-- save_club_member writes a member and their per-sport tiers in one transaction.
-- start_planned_session turns a plan into the running session in one
-- transaction: it saves the session (save_session), carries over the plan's
-- club, title and cover, then removes the plan. Both are security invoker, so
-- RLS still decides what the caller may touch.
-- The club-media bucket holds club and session photos. It is public for reads
-- (the API serves them at /api/media/...; object names carry random UUIDs),
-- and only the owner may write under their own folder, <owner id>/....

create or replace function public.save_club_member(p_member jsonb, p_sports jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (p_member ->> 'id')::uuid;
begin
  insert into public.club_members (id, club_id, name, contact)
  values (v_id, (p_member ->> 'club_id')::uuid, p_member ->> 'name', p_member ->> 'contact')
  on conflict (id) do update
    set name = excluded.name, contact = excluded.contact
    where public.club_members.club_id = excluded.club_id;

  delete from public.club_member_sports
  where member_id = v_id
    and sport_id not in (select s ->> 'sport_id' from jsonb_array_elements(p_sports) s);

  insert into public.club_member_sports (member_id, sport_id, tier_id)
  select v_id, s.sport_id, s.tier_id
  from jsonb_to_recordset(p_sports) as s (sport_id text, tier_id text)
  on conflict (member_id, sport_id) do update set tier_id = excluded.tier_id;
end;
$$;

grant execute on function public.save_club_member(jsonb, jsonb) to authenticated;

create or replace function public.start_planned_session(
  p_plan_id uuid,
  p_session jsonb,
  p_courts jsonb,
  p_players jsonb,
  p_matches jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan public.planned_sessions%rowtype;
  v_version integer;
begin
  select * into v_plan from public.planned_sessions where id = p_plan_id for update;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0001';
  end if;

  v_version := public.save_session(p_session, p_courts, p_players, p_matches, null);

  update public.sessions
  set club_id = v_plan.club_id, title = v_plan.title, cover_path = v_plan.cover_path
  where id = (p_session ->> 'id')::uuid;

  delete from public.planned_sessions where id = p_plan_id;
  return v_version;
end;
$$;

grant execute on function public.start_planned_session(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-media', 'club-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Club owners read their media" on storage.objects for select to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Club owners upload their media" on storage.objects for insert to authenticated
  with check (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Club owners replace their media" on storage.objects for update to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Club owners remove their media" on storage.objects for delete to authenticated
  using (bucket_id = 'club-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
