ALTER TABLE "club_members" DROP CONSTRAINT "club_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "player_sports" DROP CONSTRAINT "player_sports_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "club_members" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "clubs" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "clubs" ALTER COLUMN "owner_id" SET DEFAULT (auth.jwt() ->> 'sub');--> statement-breakpoint
ALTER TABLE "player_sports" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "player_sports" ALTER COLUMN "user_id" SET DEFAULT (auth.jwt() ->> 'sub');--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT (auth.jwt() ->> 'sub');--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "owner_id" SET DEFAULT (auth.jwt() ->> 'sub');--> statement-breakpoint
ALTER POLICY "Owners manage their club badges" ON "club_badges" TO authenticated USING (exists (select 1 from public.clubs k where k.id = "club_badges"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_badges"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their club invites" ON "club_invites" TO authenticated USING (exists (select 1 from public.clubs k where k.id = "club_invites"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_invites"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their club member tiers" ON "club_member_sports" TO authenticated USING (exists (select 1 from public.club_members m join public.clubs k on k.id = m.club_id where m.id = "club_member_sports"."member_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.club_members m join public.clubs k on k.id = m.club_id where m.id = "club_member_sports"."member_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their club members" ON "club_members" TO authenticated USING (exists (select 1 from public.clubs k where k.id = "club_members"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "club_members"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their clubs" ON "clubs" TO authenticated USING ("clubs"."owner_id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("clubs"."owner_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
ALTER POLICY "Owners manage their matches" ON "matches" TO authenticated USING (exists (select 1 from public.sessions s where s.id = "matches"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "matches"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their planned sessions" ON "planned_sessions" TO authenticated USING (exists (select 1 from public.clubs k where k.id = "planned_sessions"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.clubs k where k.id = "planned_sessions"."club_id" and k.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "People manage their own sports" ON "player_sports" TO authenticated USING ("player_sports"."user_id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("player_sports"."user_id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
ALTER POLICY "People manage their own profile" ON "profiles" TO authenticated USING ("profiles"."id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("profiles"."id" = (select auth.jwt() ->> 'sub'));--> statement-breakpoint
ALTER POLICY "Owners manage their courts" ON "session_courts" TO authenticated USING (exists (select 1 from public.sessions s where s.id = "session_courts"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "session_courts"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their players" ON "session_players" TO authenticated USING (exists (select 1 from public.sessions s where s.id = "session_players"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub'))) WITH CHECK (exists (select 1 from public.sessions s where s.id = "session_players"."session_id" and s.owner_id = (select auth.jwt() ->> 'sub')));--> statement-breakpoint
ALTER POLICY "Owners manage their sessions" ON "sessions" TO authenticated USING ("sessions"."owner_id" = (select auth.jwt() ->> 'sub')) WITH CHECK ("sessions"."owner_id" = (select auth.jwt() ->> 'sub'));