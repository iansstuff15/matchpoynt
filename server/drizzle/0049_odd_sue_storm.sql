ALTER TABLE "planned_sessions" ADD COLUMN "sign_up" text DEFAULT 'approval' NOT NULL;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "max_players" integer;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_sign_up_check" CHECK ("planned_sessions"."sign_up" in ('approval', 'open'));--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_max_players_check" CHECK ("planned_sessions"."max_players" is null or "planned_sessions"."max_players" between 2 and 200);