-- Custom migration: the club picker lists the clubs the caller owns as well as
-- those they're a member of, so an owner playing in their own club finds it there.

create or replace function public.my_member_clubs()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.club_card(c) order by lower(c.name), c.id), '[]'::jsonb)
  from public.clubs c
  where c.handle is not null
    and (
      c.owner_id = (select auth.jwt() ->> 'sub')
      or exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = (select auth.jwt() ->> 'sub'))
    );
$$;
