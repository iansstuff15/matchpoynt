-- Custom migration: viewing someone else's profile. Profiles are each
-- person's own under RLS; this answers, for any signed-in person, only what a
-- public profile shows: username, photo, city, role, when they joined, social
-- links, sports and tiers, and the clubs (with handles) they're a member of.
-- Never names, email or phone. `null` for an unknown username.

create function public.person_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'username', p.username,
    'avatar_path', p.avatar_path,
    'avatar_position', p.avatar_position,
    'city', p.city,
    'role', p.role,
    'created_at', p.created_at,
    'social_links', p.social_links,
    'sports', coalesce((select jsonb_agg(jsonb_build_object('sport_id', s.sport_id, 'tier_id', s.tier_id) order by s.sport_id) from public.player_sports s where s.user_id = p.id), '[]'::jsonb),
    'clubs', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'handle', k.handle, 'avatar_path', k.avatar_path, 'avatar_position', k.avatar_position) order by lower(k.name))
      from public.clubs k
      where k.handle is not null and exists (select 1 from public.club_members m where m.club_id = k.id and m.user_id = p.id)
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p_username is not null and p.username = lower(btrim(p_username, ' @'));
$$;
--> statement-breakpoint
revoke execute on function public.person_profile(text) from public;
--> statement-breakpoint
grant execute on function public.person_profile(text) to authenticated;
