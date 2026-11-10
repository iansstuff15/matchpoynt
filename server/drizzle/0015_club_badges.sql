CREATE TABLE "club_badges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"icon_path" text,
	"icon_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_badges_name_check" CHECK (char_length("club_badges"."name") between 1 and 30),
	CONSTRAINT "club_badges_description_check" CHECK (char_length("club_badges"."description") <= 160),
	CONSTRAINT "club_badges_scope_check" CHECK ("club_badges"."scope" in ('session', 'career')),
	CONSTRAINT "club_badges_icon_source_check" CHECK ("club_badges"."icon_source" in ('upload', 'giphy'))
);
--> statement-breakpoint
ALTER TABLE "club_badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_badges" ADD CONSTRAINT "club_badges_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_badges_club_idx" ON "club_badges" USING btree ("club_id","created_at");--> statement-breakpoint
CREATE POLICY "Owners manage their club badges" ON "club_badges" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from public.clubs k where k.id = "club_badges"."club_id" and k.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_badges"."club_id" and k.owner_id = (select auth.uid())));