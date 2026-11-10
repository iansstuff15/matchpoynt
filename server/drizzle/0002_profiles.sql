CREATE TABLE "player_sports" (
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"sport_id" text NOT NULL,
	"tier_id" text NOT NULL,
	CONSTRAINT "player_sports_user_id_sport_id_pk" PRIMARY KEY("user_id","sport_id")
);
--> statement-breakpoint
ALTER TABLE "player_sports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT auth.uid() NOT NULL,
	"first_name" text,
	"last_name" text,
	"display_name" text,
	"phone" text,
	"city" text,
	"role" text,
	"terms_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" in ('queue_master', 'player', 'both')),
	CONSTRAINT "profiles_first_name_check" CHECK (char_length("profiles"."first_name") between 1 and 60),
	CONSTRAINT "profiles_last_name_check" CHECK (char_length("profiles"."last_name") between 1 and 60),
	CONSTRAINT "profiles_display_name_check" CHECK (char_length("profiles"."display_name") between 2 and 30),
	CONSTRAINT "profiles_phone_check" CHECK (char_length("profiles"."phone") <= 30),
	CONSTRAINT "profiles_city_check" CHECK (char_length("profiles"."city") <= 80)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "player_sports" ADD CONSTRAINT "player_sports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_sports_sport_idx" ON "player_sports" USING btree ("sport_id");--> statement-breakpoint
CREATE POLICY "People manage their own sports" ON "player_sports" AS PERMISSIVE FOR ALL TO "authenticated" USING ("player_sports"."user_id" = (select auth.uid())) WITH CHECK ("player_sports"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "People manage their own profile" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("profiles"."id" = (select auth.uid())) WITH CHECK ("profiles"."id" = (select auth.uid()));