-- Custom migration: signing in with a username, and club cards with the club's colours.
-- account_for_username answers only the account id behind a username (never its email):
-- the API then asks Firebase, with its service account, which email that account signs in
-- with. Like profile_card it is readable signed out, because sign-in happens signed out.
-- club_card now carries the club's colours, so directory cards wear them.

create function public.account_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  where p_username is not null and p.username = lower(ltrim(btrim(p_username), '@'));
$$;
--> statement-breakpoint

create or replace function public.club_card(p_club public.clubs)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_club.id,
    'name', p_club.name,
    'handle', p_club.handle,
    'description', p_club.description,
    'avatar_path', p_club.avatar_path,
    'avatar_position', p_club.avatar_position,
    'cover_path', p_club.cover_path,
    'cover_position', p_club.cover_position,
    'theme', p_club.theme,
    'members', (select count(*) from public.club_members m where m.club_id = p_club.id),
    'approval', p_club.join_approval,
    'membership', public.club_membership(p_club.id)
  );
$$;
--> statement-breakpoint

revoke execute on function public.account_for_username(text) from public;
--> statement-breakpoint
grant execute on function public.account_for_username(text) to anon, authenticated;
