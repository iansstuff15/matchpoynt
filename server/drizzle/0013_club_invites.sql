CREATE TABLE "club_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "club_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "club_invites_status_check" CHECK ("club_invites"."status" in ('pending', 'accepted', 'revoked')),
	CONSTRAINT "club_invites_token_check" CHECK ("club_invites"."token" ~ '^[A-Za-z0-9_-]{22}$'),
	CONSTRAINT "club_invites_email_check" CHECK (char_length("club_invites"."email") between 3 and 254)
);
--> statement-breakpoint
ALTER TABLE "club_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_members" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "club_members" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "club_invites" ADD CONSTRAINT "club_invites_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_invites" ADD CONSTRAINT "club_invites_member_id_club_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."club_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_invites_member_idx" ON "club_invites" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_email_check" CHECK (char_length("club_members"."email") <= 254);--> statement-breakpoint
CREATE POLICY "Owners manage their club invites" ON "club_invites" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_invites"."club_id" and k.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_invites"."club_id" and k.owner_id = (select auth.uid())));