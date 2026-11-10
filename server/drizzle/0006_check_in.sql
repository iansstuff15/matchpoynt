ALTER TABLE "session_players" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "check_in_slug" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_check_in_slug_unique" UNIQUE("check_in_slug");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_check_in_slug_check" CHECK ("sessions"."check_in_slug" ~ '^[A-Za-z0-9_-]{22}$');