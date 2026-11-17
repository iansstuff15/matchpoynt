CREATE TABLE "club_join_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "club_join_requests_status_check" CHECK ("club_join_requests"."status" in ('pending', 'approved', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "club_join_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_join_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"plan_id" uuid,
	"session_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "session_join_requests_status_check" CHECK ("session_join_requests"."status" in ('pending', 'approved', 'declined')),
	CONSTRAINT "session_join_requests_target_check" CHECK (("session_join_requests"."plan_id" is null) <> ("session_join_requests"."session_id" is null))
);
--> statement-breakpoint
ALTER TABLE "session_join_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_invites" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "club_invites" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "join_approval" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "welcome_message" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "welcome_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "club_join_requests" ADD CONSTRAINT "club_join_requests_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_member_id_club_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."club_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_plan_id_planned_sessions_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."planned_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "club_join_requests_pending_idx" ON "club_join_requests" USING btree ("club_id","user_id") WHERE "club_join_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "session_join_requests_club_idx" ON "session_join_requests" USING btree ("club_id","status");--> statement-breakpoint
CREATE INDEX "club_invites_user_idx" ON "club_invites" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_join_approval_check" CHECK ("clubs"."join_approval" in ('auto', 'manual'));--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_welcome_message_check" CHECK (char_length("clubs"."welcome_message") <= 1000);--> statement-breakpoint
CREATE POLICY "Owners manage their club join requests" ON "club_join_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_join_requests"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_join_requests"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
CREATE POLICY "Owners manage their session join requests" ON "session_join_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "session_join_requests"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "session_join_requests"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));