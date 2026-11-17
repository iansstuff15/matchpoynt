CREATE TABLE "club_announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_announcements_title_check" CHECK (char_length("club_announcements"."title") between 1 and 80),
	CONSTRAINT "club_announcements_body_check" CHECK (char_length("club_announcements"."body") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "club_announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_announcements_club_idx" ON "club_announcements" USING btree ("club_id","created_at");--> statement-breakpoint
CREATE POLICY "Owners manage their club announcements" ON "club_announcements" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_announcements"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_announcements"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));