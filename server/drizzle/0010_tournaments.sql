ALTER TABLE "session_courts" ADD COLUMN "tournament" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "tournament" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "tournament_slug" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tournament_slug_unique" UNIQUE("tournament_slug");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tournament_slug_check" CHECK ("sessions"."tournament_slug" ~ '^[A-Za-z0-9_-]{22}$');