-- Custom migration: club invites.
-- The invitee isn't the club's owner, so RLS hides the invite from them. These
-- two security definer functions are their only way in, scoped to the one
-- invite whose token they hold:
-- club_invite shows what they're joining; accept_club_invite links their
-- account to the member, and only for the email the invite was sent to.

create function public.club_invite(p_token text)
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
    'for_caller', lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', '')),
    'accepted_by_caller', m.user_id is not null and m.user_id = auth.uid()
  )
  from public.club_invites i
  join public.club_members m on m.id = i.member_id
  join public.clubs k on k.id = i.club_id
  where p_token is not null and i.token = p_token;
$$;
--> statement-breakpoint

create function public.accept_club_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.club_invites%rowtype;
  v_club text;
begin
  select * into v_invite from public.club_invites where token = p_token for update;
  if not found or v_invite.status = 'revoked' then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'invite_wrong_email' using errcode = 'P0001';
  end if;
  if v_invite.status = 'accepted' then
    if not exists (select 1 from public.club_members where id = v_invite.member_id and user_id = auth.uid()) then
      raise exception 'invite_used' using errcode = 'P0001';
    end if;
  else
    update public.club_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
    update public.club_members set user_id = auth.uid() where id = v_invite.member_id;
  end if;
  select name into v_club from public.clubs where id = v_invite.club_id;
  return v_club;
end;
$$;
--> statement-breakpoint

revoke execute on function public.club_invite(text) from public, anon;
--> statement-breakpoint
revoke execute on function public.accept_club_invite(text) from public, anon;
--> statement-breakpoint
grant execute on function public.club_invite(text) to authenticated;
--> statement-breakpoint
grant execute on function public.accept_club_invite(text) to authenticated;
