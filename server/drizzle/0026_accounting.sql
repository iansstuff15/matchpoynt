CREATE TABLE "club_billers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_billers_name_check" CHECK (char_length("club_billers"."name") between 1 and 80),
	CONSTRAINT "club_billers_contact_check" CHECK (char_length("club_billers"."contact") <= 120),
	CONSTRAINT "club_billers_notes_check" CHECK (char_length("club_billers"."notes") <= 500)
);
--> statement-breakpoint
ALTER TABLE "club_billers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "club_expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"biller_id" uuid,
	"session_id" uuid,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"spent_on" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_expenses_description_check" CHECK (char_length("club_expenses"."description") between 1 and 120),
	CONSTRAINT "club_expenses_notes_check" CHECK (char_length("club_expenses"."notes") <= 500),
	CONSTRAINT "club_expenses_amount_check" CHECK ("club_expenses"."amount" > 0),
	CONSTRAINT "club_expenses_currency_check" CHECK ("club_expenses"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "club_expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_billers" ADD CONSTRAINT "club_billers_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_expenses" ADD CONSTRAINT "club_expenses_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_expenses" ADD CONSTRAINT "club_expenses_biller_id_club_billers_id_fk" FOREIGN KEY ("biller_id") REFERENCES "public"."club_billers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_expenses" ADD CONSTRAINT "club_expenses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_billers_club_idx" ON "club_billers" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "club_expenses_club_idx" ON "club_expenses" USING btree ("club_id","spent_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "club_expenses_session_idx" ON "club_expenses" USING btree ("session_id");--> statement-breakpoint
CREATE POLICY "Owners manage their club billers" ON "club_billers" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_billers"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_billers"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "Owners manage their club expenses" ON "club_expenses" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_expenses"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_expenses"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));