CREATE TABLE "club_feedback_forms" (
	"club_id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_feedback_forms_title_check" CHECK (char_length("club_feedback_forms"."title") between 1 and 80),
	CONSTRAINT "club_feedback_forms_intro_check" CHECK (char_length("club_feedback_forms"."intro") <= 500)
);
--> statement-breakpoint
ALTER TABLE "club_feedback_forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "club_feedback_responses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"member_name" text NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_feedback_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requester_id" text DEFAULT (auth.jwt() ->> 'sub') NOT NULL,
	"addressee_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "friendships_status_check" CHECK ("friendships"."status" in ('pending', 'accepted')),
	CONSTRAINT "friendships_self_check" CHECK ("friendships"."requester_id" <> "friendships"."addressee_id")
);
--> statement-breakpoint
ALTER TABLE "friendships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_members" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "club_feedback_forms" ADD CONSTRAINT "club_feedback_forms_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_feedback_responses" ADD CONSTRAINT "club_feedback_responses_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_feedback_responses" ADD CONSTRAINT "club_feedback_responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_profiles_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "club_feedback_responses_once_idx" ON "club_feedback_responses" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "club_feedback_responses_club_idx" ON "club_feedback_responses" USING btree ("club_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_idx" ON "friendships" USING btree (least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id"));--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_role_check" CHECK ("club_members"."role" in ('member', 'captain', 'coach', 'queue_master', 'manager'));--> statement-breakpoint
CREATE POLICY "Owners manage their club feedback form" ON "club_feedback_forms" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_feedback_forms"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_feedback_forms"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "Owners read their club feedback" ON "club_feedback_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_feedback_responses"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "Owners delete their club feedback" ON "club_feedback_responses" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_feedback_responses"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "People see their own friendships" ON "friendships" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.jwt() ->> 'sub') in ("friendships"."requester_id", "friendships"."addressee_id"));--> statement-breakpoint
CREATE POLICY "People ask others to be friends" ON "friendships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("friendships"."requester_id" = (select auth.jwt() ->> 'sub') and "friendships"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "Either friend can remove a friendship" ON "friendships" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.jwt() ->> 'sub') in ("friendships"."requester_id", "friendships"."addressee_id"));