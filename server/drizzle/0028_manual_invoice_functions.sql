-- Custom migration: manual club invoices.
-- create_club_invoice writes a manual invoice and its payers in one
-- transaction. The API has already checked it and worked out each payer's
-- amount (utils/accounting/invoices.ts). Security invoker, so RLS limits it
-- to the caller's own clubs.

create function public.create_club_invoice(p_invoice jsonb, p_payers jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (p_invoice ->> 'id')::uuid;
begin
  insert into public.club_invoices (id, club_id, title, notes, currency, issued_on, amount, split)
  values (
    v_id,
    (p_invoice ->> 'club_id')::uuid,
    p_invoice ->> 'title',
    p_invoice ->> 'notes',
    p_invoice ->> 'currency',
    (p_invoice ->> 'issued_on')::date,
    (p_invoice ->> 'amount')::integer,
    p_invoice ->> 'split'
  );

  insert into public.club_invoice_payers (id, invoice_id, member_id, name, amount, position)
  select p.id, v_id, p.member_id, p.name, p.amount, p.position
  from jsonb_to_recordset(p_payers) as p (id uuid, member_id uuid, name text, amount integer, position integer);
end;
$$;
--> statement-breakpoint

revoke execute on function public.create_club_invoice(jsonb, jsonb) from public, anon;
--> statement-breakpoint
grant execute on function public.create_club_invoice(jsonb, jsonb) to authenticated;
