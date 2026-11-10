DROP INDEX "sessions_one_active_per_owner";--> statement-breakpoint
CREATE INDEX "sessions_owner_status_idx" ON "sessions" USING btree ("owner_id","status");