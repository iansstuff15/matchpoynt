CREATE TABLE "session_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"games" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_invoices_games_check" CHECK ("session_invoices"."games" >= 0),
	CONSTRAINT "session_invoices_amount_check" CHECK ("session_invoices"."amount" >= 0),
	CONSTRAINT "session_invoices_currency_check" CHECK ("session_invoices"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "session_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "fee" jsonb;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "fee" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "fee" jsonb;--> statement-breakpoint
ALTER TABLE "session_invoices" ADD CONSTRAINT "session_invoices_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_invoices" ADD CONSTRAINT "session_invoices_player_id_session_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."session_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_invoices_player_idx" ON "session_invoices" USING btree ("session_id","player_id");--> statement-breakpoint
CREATE POLICY "Owners manage their invoices" ON "session_invoices" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.sessions s where s.id = "session_invoices"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "session_invoices"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub')));