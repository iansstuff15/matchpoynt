CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"sport_id" text NOT NULL,
	"court_id" uuid,
	"court_label" text NOT NULL,
	"side_a" uuid[] NOT NULL,
	"side_b" uuid[] NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"games" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"winner" text,
	CONSTRAINT "matches_winner_check" CHECK ("matches"."winner" in ('a', 'b'))
);
--> statement-breakpoint
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_courts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "session_courts_label_check" CHECK (char_length("session_courts"."label") between 1 and 60),
	CONSTRAINT "session_courts_status_check" CHECK ("session_courts"."status" in ('open', 'playing'))
);
--> statement-breakpoint
ALTER TABLE "session_courts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tier_id" text NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"rotation" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "session_players_name_check" CHECK (char_length("session_players"."name") between 1 and 60),
	CONSTRAINT "session_players_status_check" CHECK ("session_players"."status" in ('waiting', 'playing'))
);
--> statement-breakpoint
ALTER TABLE "session_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"sport_id" text NOT NULL,
	"scoring" jsonb NOT NULL,
	"rules" jsonb NOT NULL,
	"matchmaking" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"public_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "sessions_public_slug_unique" UNIQUE("public_slug"),
	CONSTRAINT "sessions_matchmaking_check" CHECK ("sessions"."matchmaking" in ('rotation', 'balanced', 'skill-grouped')),
	CONSTRAINT "sessions_status_check" CHECK ("sessions"."status" in ('active', 'ended')),
	CONSTRAINT "sessions_public_slug_check" CHECK ("sessions"."public_slug" ~ '^[A-Za-z0-9_-]{22}$')
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_court_id_session_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."session_courts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_courts" ADD CONSTRAINT "session_courts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_session_idx" ON "matches" USING btree ("session_id","finished_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "matches_sport_idx" ON "matches" USING btree ("sport_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_one_open_per_court" ON "matches" USING btree ("court_id") WHERE "matches"."finished_at" is null;--> statement-breakpoint
CREATE INDEX "session_courts_session_idx" ON "session_courts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_players_session_idx" ON "session_players" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_active_per_owner" ON "sessions" USING btree ("owner_id") WHERE "sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "sessions_sport_idx" ON "sessions" USING btree ("sport_id");--> statement-breakpoint
CREATE POLICY "Owners manage their matches" ON "matches" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.sessions s where s.id = "matches"."session_id" and s.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "matches"."session_id" and s.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Owners manage their courts" ON "session_courts" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.sessions s where s.id = "session_courts"."session_id" and s.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "session_courts"."session_id" and s.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Owners manage their players" ON "session_players" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.sessions s where s.id = "session_players"."session_id" and s.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "session_players"."session_id" and s.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Owners manage their sessions" ON "sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("sessions"."owner_id" = (select auth.uid())) WITH CHECK ("sessions"."owner_id" = (select auth.uid()));