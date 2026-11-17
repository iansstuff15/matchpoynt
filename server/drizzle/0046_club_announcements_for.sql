-- Custom migration: members reading their club's announcements. Announcements
-- are the owner's under RLS; this returns the newest `p_limit` (pinned first)
-- to the club's members and its owner only, and `null` to anyone else.

create function public.club_announcements_for(p_club_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.clubs k where k.id = p_club_id and k.owner_id = (select auth.jwt() ->> 'sub'))
      or exists (select 1 from public.club_members m where m.club_id = p_club_id and m.user_id = (select auth.jwt() ->> 'sub'))
    then coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'pinned', a.pinned, 'created_at', a.created_at, 'updated_at', a.updated_at) order by a.pinned desc, a.created_at desc)
      from (
        select * from public.club_announcements x
        where x.club_id = p_club_id
        order by x.pinned desc, x.created_at desc
        limit greatest(least(p_limit, 50), 1)
      ) a
    ), '[]'::jsonb)
  end;
$$;
--> statement-breakpoint
revoke execute on function public.club_announcements_for(uuid, integer) from public;
--> statement-breakpoint
grant execute on function public.club_announcements_for(uuid, integer) to authenticated;
