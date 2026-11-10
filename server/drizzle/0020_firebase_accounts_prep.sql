-- Accounts move from Supabase Auth to Firebase Auth (Supabase third-party auth).
-- Account ids become Firebase UIDs (text), so the next migration changes the
-- owner columns from uuid to text. Postgres can't change the type of a column a
-- policy reads, so the policies are first pointed at nothing (deny all) here,
-- then rewritten with the new columns by the generated migration. Migrations
-- run in one transaction, so nothing is ever open in between.
--
-- Existing rows belong to Supabase Auth accounts that no longer sign in, so
-- they are cleared. Photos already in the club-media bucket are left in Storage.

truncate table public.sessions, public.clubs, public.profiles, public.player_sports cascade;
--> statement-breakpoint
alter policy "Owners manage their sessions" on public.sessions using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their matches" on public.matches using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their courts" on public.session_courts using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their players" on public.session_players using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their clubs" on public.clubs using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their club members" on public.club_members using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their club member tiers" on public.club_member_sports using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their planned sessions" on public.planned_sessions using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their club invites" on public.club_invites using (false) with check (false);
--> statement-breakpoint
alter policy "Owners manage their club badges" on public.club_badges using (false) with check (false);
--> statement-breakpoint
alter policy "People manage their own profile" on public.profiles using (false) with check (false);
--> statement-breakpoint
alter policy "People manage their own sports" on public.player_sports using (false) with check (false);
--> statement-breakpoint
-- The old defaults call auth.uid(), which fails for a Firebase UID; the generated migration sets the new ones.
alter table public.sessions alter column owner_id drop default;
--> statement-breakpoint
alter table public.clubs alter column owner_id drop default;
--> statement-breakpoint
alter table public.profiles alter column id drop default;
--> statement-breakpoint
alter table public.player_sports alter column user_id drop default;
