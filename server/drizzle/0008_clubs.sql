CREATE TABLE "club_member_sports" (
	"member_id" uuid NOT NULL,
	"sport_id" text NOT NULL,
	"tier_id" text NOT NULL,
	CONSTRAINT "club_member_sports_member_id_sport_id_pk" PRIMARY KEY("member_id","sport_id")
);
--> statement-breakpoint
ALTER TABLE "club_member_sports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "club_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_name_check" CHECK (char_length("club_members"."name") between 1 and 60),
	CONSTRAINT "club_members_contact_check" CHECK (char_length("club_members"."contact") <= 120)
);
--> statement-breakpoint
ALTER TABLE "club_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar_path" text,
	"cover_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_name_check" CHECK (char_length("clubs"."name") between 1 and 60),
	CONSTRAINT "clubs_description_check" CHECK (char_length("clubs"."description") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "clubs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planned_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"sport_id" text NOT NULL,
	"title" text NOT NULL,
	"scheduled_for" timestamp with time zone,
	"scoring" jsonb NOT NULL,
	"rules" jsonb NOT NULL,
	"matchmaking" text NOT NULL,
	"courts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"member_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"cover_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_sessions_title_check" CHECK (char_length("planned_sessions"."title") between 1 and 80),
	CONSTRAINT "planned_sessions_matchmaking_check" CHECK ("planned_sessions"."matchmaking" in ('rotation', 'balanced', 'skill-grouped'))
);
--> statement-breakpoint
ALTER TABLE "planned_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "cover_path" text;--> statement-breakpoint
ALTER TABLE "club_member_sports" ADD CONSTRAINT "club_member_sports_member_id_club_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."club_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_member_sports_sport_idx" ON "club_member_sports" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "club_members_club_idx" ON "club_members" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "clubs_owner_idx" ON "clubs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "planned_sessions_club_idx" ON "planned_sessions" USING btree ("club_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "planned_sessions_sport_idx" ON "planned_sessions" USING btree ("sport_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_club_idx" ON "sessions" USING btree ("club_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_title_check" CHECK (char_length("sessions"."title") between 1 and 80);--> statement-breakpoint
CREATE POLICY "Owners manage their club member tiers" ON "club_member_sports" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.club_members m join public.clubs k on k.id = m.club_id where m.id = "club_member_sports"."member_id" and k.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.club_members m join public.clubs k on k.id = m.club_id where m.id = "club_member_sports"."member_id" and k.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Owners manage their club members" ON "club_members" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_members"."club_id" and k.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_members"."club_id" and k.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Owners manage their clubs" ON "clubs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("clubs"."owner_id" = (select auth.uid())) WITH CHECK ("clubs"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "Owners manage their planned sessions" ON "planned_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "planned_sessions"."club_id" and k.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "planned_sessions"."club_id" and k.owner_id = (select auth.uid())));