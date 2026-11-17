ALTER TABLE "clubs" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_path" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_position" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_handle_idx" ON "clubs" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_handle_check" CHECK ("clubs"."handle" ~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$' and char_length("clubs"."handle") between 3 and 30);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_check" CHECK ("profiles"."username" ~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$' and char_length("profiles"."username") between 3 and 30);