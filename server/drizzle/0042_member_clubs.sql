-- Custom migration: the clubs the caller is a member of, for the club picker
-- players see when they sign in. The same cards as the directory (club_card),
-- by name. Members only see clubs they're on the roster of (linked to their
-- account), never anyone else's.

create function public.my_member_clubs()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.club_card(c) order by lower(c.name), c.id), '[]'::jsonb)
  from public.clubs c
  where c.handle is not null
    and exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = (select auth.jwt() ->> 'sub'));
$$;
--> statement-breakpoint
revoke execute on function public.my_member_clubs() from public;
--> statement-breakpoint
grant execute on function public.my_member_clubs() to authenticated;
