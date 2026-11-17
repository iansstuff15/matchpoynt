-- Custom migration: payments in parts, and the club's payment QR codes for players.
-- Invoices already marked paid become one payment of their whole amount, on
-- the day they were marked, with no method (it wasn't asked then), so totals
-- and the accounting dashboard read the same as before.

update public.session_invoices
set payments = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'amount', amount, 'method', null, 'paidAt', paid_at))
where paid_at is not null and amount > 0 and payments = '[]'::jsonb;
--> statement-breakpoint
update public.club_invoice_payers
set payments = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'amount', amount, 'method', null, 'paidAt', paid_at))
where paid_at is not null and amount > 0 and payments = '[]'::jsonb;
--> statement-breakpoint

-- A club session that has ended, for its players' "Session ended" screen and
-- their session history: its title, sport, club and when it ended, plus what the
-- caller owes for it (their invoice, matched by their name on the club's roster,
-- with its payments), the session's fee (for how it was worked out) and the
-- club's payment QR codes. Only for the club's members and its owner; `null`
-- otherwise or while it's still running.
create or replace function public.player_ended_session(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.sessions x where x.id = p_session_id and x.status = 'ended' and x.club_id is not null),
  k as (select * from public.clubs c where c.id = (select club_id from s)),
  me as (
    select m.name from public.club_members m
    where m.club_id = (select id from k) and m.user_id = (select auth.jwt() ->> 'sub')
    limit 1
  ),
  mine as (
    select i.* from public.session_invoices i
    where i.session_id = (select id from s)
      and lower(regexp_replace(btrim(i.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim((select name from me)), '\s+', ' ', 'g'))
    limit 1
  )
  select jsonb_build_object(
    'session_id', s.id, 'title', s.title, 'sport_id', s.sport_id, 'ended_at', s.ended_at,
    'club', jsonb_build_object('name', k.name, 'handle', k.handle),
    'fee', s.fee,
    'my_invoice', (select jsonb_build_object('amount', amount, 'currency', currency, 'games', games, 'paid_at', paid_at, 'payments', payments) from mine),
    'payment_qrs', k.payment_qrs
  )
  from s, k
  where exists (select 1 from me) or k.owner_id = (select auth.jwt() ->> 'sub');
$$;
