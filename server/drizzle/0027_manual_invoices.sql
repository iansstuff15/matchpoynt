CREATE TABLE "club_invoice_payers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invoice_id" uuid NOT NULL,
	"member_id" uuid,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"position" integer NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "club_invoice_payers_name_check" CHECK (char_length("club_invoice_payers"."name") between 1 and 60),
	CONSTRAINT "club_invoice_payers_amount_check" CHECK ("club_invoice_payers"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "club_invoice_payers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "club_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"currency" text NOT NULL,
	"issued_on" date NOT NULL,
	"amount" integer NOT NULL,
	"split" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_invoices_title_check" CHECK (char_length("club_invoices"."title") between 1 and 120),
	CONSTRAINT "club_invoices_notes_check" CHECK (char_length("club_invoices"."notes") <= 500),
	CONSTRAINT "club_invoices_amount_check" CHECK ("club_invoices"."amount" > 0),
	CONSTRAINT "club_invoices_currency_check" CHECK ("club_invoices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "club_invoices_split_check" CHECK ("club_invoices"."split" in ('each', 'total'))
);
--> statement-breakpoint
ALTER TABLE "club_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_invoice_payers" ADD CONSTRAINT "club_invoice_payers_invoice_id_club_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."club_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_invoice_payers" ADD CONSTRAINT "club_invoice_payers_member_id_club_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."club_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_invoices" ADD CONSTRAINT "club_invoices_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_invoice_payers_invoice_idx" ON "club_invoice_payers" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "club_invoices_club_idx" ON "club_invoices" USING btree ("club_id","issued_on" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "Owners manage their club invoice payers" ON "club_invoice_payers" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.club_invoices i join public.clubs k on k.id = i.club_id where i.id = "club_invoice_payers"."invoice_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.club_invoices i join public.clubs k on k.id = i.club_id where i.id = "club_invoice_payers"."invoice_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "Owners manage their club invoices" ON "club_invoices" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_invoices"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_invoices"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));