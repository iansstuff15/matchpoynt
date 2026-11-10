import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgPolicy, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'

// The database schema, in code. `pnpm db:generate` turns changes here into a
// SQL migration in server/drizzle/; `pnpm db:migrate` applies them.
// Every table has RLS: a Queue Master sees only the sessions they own. The
// API queries as the signed-in user, so these policies are the final check.
// Accounts are Firebase Auth users (Supabase third-party auth): an account id
// is the Firebase UID in the token's `sub`. It isn't a UUID, so `auth.uid()`
// can't be used, and there is no `auth.users` row to reference.

/** The calling account, evaluated once per statement in policies. */
const authUid = sql`(select auth.jwt() ->> 'sub')`
/** The calling account, as a column default. */
const callerId = sql`(auth.jwt() ->> 'sub')`

const ownsSession = (sessionId: unknown) =>
  sql`exists (select 1 from public.sessions s where s.id = ${sessionId} and s.owner_id = ${authUid})`

const ownerPolicy = (name: string, condition: ReturnType<typeof sql>) =>
  pgPolicy(name, { for: 'all', to: authenticatedRole, using: condition, withCheck: condition })

const ownsClub = (clubId: unknown) => sql`exists (select 1 from public.clubs k where k.id = ${clubId} and k.owner_id = ${authUid})`

/**
 * A club run by one account (an account can run several). Its photos live in
 * the `club-media` Storage bucket under `<owner id>/<club id>/`; only the
 * object paths are stored here.
 */
export const clubs = pgTable(
  'clubs',
  {
    id: uuid().primaryKey(),
    ownerId: text('owner_id').notNull().default(callerId),
    name: text().notNull(),
    description: text(),
    avatarPath: text('avatar_path'),
    coverPath: text('cover_path'),
    /** How each photo sits in its frame: { x, y, zoom } (utils/club/appearance.ts); null = centred. */
    avatarPosition: jsonb('avatar_position'),
    coverPosition: jsonb('cover_position'),
    /** The club's colours for the app: { accent, sidebar } as hex; null = Matchpoynt's own. */
    theme: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('clubs_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('clubs_description_check', sql`char_length(${t.description}) <= 1000`),
    index('clubs_owner_idx').on(t.ownerId),
    ownerPolicy('Owners manage their clubs', sql`${t.ownerId} = ${authUid}`),
  ],
)

/** A club's roster: named people, with no account needed. */
export const clubMembers = pgTable(
  'club_members',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    contact: text(),
    /** Where their invite went. */
    email: text(),
    /** Their Matchpoynt account, once they accept an invite. */
    userId: text('user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_members_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('club_members_email_check', sql`char_length(${t.email}) <= 254`),
    check('club_members_contact_check', sql`char_length(${t.contact}) <= 120`),
    index('club_members_club_idx').on(t.clubId),
    ownerPolicy('Owners manage their club members', ownsClub(t.clubId)),
  ],
)

/** A club member's skill tier in each sport they play. */
export const clubMemberSports = pgTable(
  'club_member_sports',
  {
    memberId: uuid('member_id')
      .notNull()
      .references(() => clubMembers.id, { onDelete: 'cascade' }),
    sportId: text('sport_id').notNull(),
    tierId: text('tier_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.sportId] }),
    index('club_member_sports_sport_idx').on(t.sportId),
    ownerPolicy(
      'Owners manage their club member tiers',
      sql`exists (select 1 from public.club_members m join public.clubs k on k.id = m.club_id where m.id = ${t.memberId} and k.owner_id = ${authUid})`,
    ),
  ],
)

/**
 * An emailed invite for a club member to link their own account. The link
 * carries an unguessable token; accepting it (`accept_club_invite`) needs the
 * same email it was sent to.
 */
export const clubInvites = pgTable(
  'club_invites',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => clubMembers.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    token: text().notNull().unique(),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => [
    check('club_invites_status_check', sql`${t.status} in ('pending', 'accepted', 'revoked')`),
    check('club_invites_token_check', sql`${t.token} ~ '^[A-Za-z0-9_-]{22}$'`),
    check('club_invites_email_check', sql`char_length(${t.email}) between 3 and 254`),
    index('club_invites_member_idx').on(t.memberId),
    ownerPolicy('Owners manage their club invites', ownsClub(t.clubId)),
  ],
)

/**
 * A club's own badge: a name, conditions (all must be met, each "metric at
 * least min") counted in one session or across every session the club runs,
 * and an icon in the `club-media` bucket (an animated GIF or a still image).
 */
export const clubBadges = pgTable(
  'club_badges',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    scope: text().notNull(),
    /** [{ metric, min }], checked by the API (utils/club/badges.ts). */
    conditions: jsonb().notNull(),
    iconPath: text('icon_path'),
    iconSource: text('icon_source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_badges_name_check', sql`char_length(${t.name}) between 1 and 30`),
    check('club_badges_description_check', sql`char_length(${t.description}) <= 160`),
    check('club_badges_scope_check', sql`${t.scope} in ('session', 'career')`),
    check('club_badges_icon_source_check', sql`${t.iconSource} in ('upload', 'giphy')`),
    index('club_badges_club_idx').on(t.clubId, t.createdAt),
    ownerPolicy('Owners manage their club badges', ownsClub(t.clubId)),
  ],
)

/** A session prepared ahead of time. Starting it creates the running session and removes the plan. */
export const plannedSessions = pgTable(
  'planned_sessions',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    sportId: text('sport_id').notNull(),
    title: text().notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    scoring: jsonb().notNull(),
    rules: jsonb().notNull(),
    matchmaking: text().notNull(),
    /** Court names, in order. */
    courts: jsonb().notNull().default(sql`'[]'::jsonb`),
    memberIds: uuid('member_ids').array().notNull().default(sql`'{}'::uuid[]`),
    coverPath: text('cover_path'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('planned_sessions_title_check', sql`char_length(${t.title}) between 1 and 80`),
    check('planned_sessions_matchmaking_check', sql`${t.matchmaking} in ('rotation', 'balanced', 'skill-grouped')`),
    index('planned_sessions_club_idx').on(t.clubId, t.scheduledFor),
    index('planned_sessions_sport_idx').on(t.sportId),
    ownerPolicy('Owners manage their planned sessions', ownsClub(t.clubId)),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey(),
    ownerId: text('owner_id').notNull().default(callerId),
    sportId: text('sport_id').notNull(),
    scoring: jsonb().notNull(),
    rules: jsonb().notNull(),
    matchmaking: text().notNull(),
    status: text().notNull().default('active'),
    version: integer().notNull().default(1),
    /** Unguessable token for the public leaderboard link; null when not published. */
    publicSlug: text('public_slug').unique(),
    /** Unguessable token behind the check-in QR; null until the Queue Master first opens it. */
    checkInSlug: text('check_in_slug').unique(),
    /** The club it was planned in; null for sessions started straight from the board. */
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    title: text(),
    /** Cover photo in the `club-media` bucket, carried over from the plan. */
    coverPath: text('cover_path'),
    /** The session's tournament (bracket, entrants, results) as one document, saved with the session; null when none. */
    tournament: jsonb(),
    /** Unguessable token for the public tournament page; null when not published. */
    tournamentSlug: text('tournament_slug').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    check('sessions_matchmaking_check', sql`${t.matchmaking} in ('rotation', 'balanced', 'skill-grouped')`),
    check('sessions_status_check', sql`${t.status} in ('active', 'ended')`),
    check('sessions_public_slug_check', sql`${t.publicSlug} ~ '^[A-Za-z0-9_-]{22}$'`),
    check('sessions_check_in_slug_check', sql`${t.checkInSlug} ~ '^[A-Za-z0-9_-]{22}$'`),
    check('sessions_tournament_slug_check', sql`${t.tournamentSlug} ~ '^[A-Za-z0-9_-]{22}$'`),
    // A Queue Master can run several sessions at once (the board's session switcher).
    index('sessions_owner_status_idx').on(t.ownerId, t.status),
    index('sessions_sport_idx').on(t.sportId),
    index('sessions_club_idx').on(t.clubId, t.createdAt.desc()),
    check('sessions_title_check', sql`char_length(${t.title}) between 1 and 80`),
    ownerPolicy('Owners manage their sessions', sql`${t.ownerId} = ${authUid}`),
  ],
)

export const sessionCourts = pgTable(
  'session_courts',
  {
    id: uuid().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    label: text().notNull(),
    position: integer().notNull(),
    status: text().notNull(),
    /** Player ids placed by hand on each side while the court is open: [[side 1], [side 2]]. */
    lineup: jsonb().notNull().default(sql`'[[],[]]'::jsonb`),
    /** Switched to tournament play: plays bracket matches only. */
    tournament: boolean().notNull().default(false),
  },
  (t) => [
    check('session_courts_label_check', sql`char_length(${t.label}) between 1 and 60`),
    check('session_courts_status_check', sql`${t.status} in ('open', 'playing')`),
    index('session_courts_session_idx').on(t.sessionId),
    ownerPolicy('Owners manage their courts', ownsSession(t.sessionId)),
  ],
)

export const sessionPlayers = pgTable(
  'session_players',
  {
    id: uuid().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    tierId: text('tier_id').notNull(),
    gamesPlayed: integer('games_played').notNull().default(0),
    rotation: integer().notNull().default(0),
    queuedAt: timestamp('queued_at', { withTimezone: true }).notNull(),
    status: text().notNull(),
    /** False once removed; kept so past results still show the name. */
    active: boolean().notNull().default(true),
    /** When they checked in at the venue (QR scan or the Queue Master); null until then. Only checked-in players are matched. */
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  },
  (t) => [
    check('session_players_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('session_players_status_check', sql`${t.status} in ('waiting', 'playing')`),
    index('session_players_session_idx').on(t.sessionId),
    ownerPolicy('Owners manage their players', ownsSession(t.sessionId)),
  ],
)

export const matches = pgTable(
  'matches',
  {
    id: uuid().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    sportId: text('sport_id').notNull(),
    courtId: uuid('court_id').references(() => sessionCourts.id, { onDelete: 'set null' }),
    courtLabel: text('court_label').notNull(),
    sideA: uuid('side_a').array().notNull(),
    sideB: uuid('side_b').array().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    games: jsonb().notNull().default(sql`'[]'::jsonb`),
    winner: text(),
  },
  (t) => [
    check('matches_winner_check', sql`${t.winner} in ('a', 'b')`),
    index('matches_session_idx').on(t.sessionId, t.finishedAt.desc()),
    index('matches_sport_idx').on(t.sportId),
    // At most one match in progress per court.
    uniqueIndex('matches_one_open_per_court').on(t.courtId).where(sql`${t.finishedAt} is null`),
    ownerPolicy('Owners manage their matches', ownsSession(t.sessionId)),
  ],
)

/**
 * A person's profile. Columns are nullable on purpose: whether a profile is
 * complete is decided by the API's required-field list, so adding a required
 * field later makes existing users complete it the next time they sign in.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: text().primaryKey().default(callerId),
    firstName: text('first_name'),
    lastName: text('last_name'),
    /** The name shown on boards and leaderboards. */
    displayName: text('display_name'),
    phone: text(),
    city: text(),
    role: text(),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('profiles_role_check', sql`${t.role} in ('queue_master', 'player', 'both')`),
    check('profiles_first_name_check', sql`char_length(${t.firstName}) between 1 and 60`),
    check('profiles_last_name_check', sql`char_length(${t.lastName}) between 1 and 60`),
    check('profiles_display_name_check', sql`char_length(${t.displayName}) between 2 and 30`),
    check('profiles_phone_check', sql`char_length(${t.phone}) <= 30`),
    check('profiles_city_check', sql`char_length(${t.city}) <= 80`),
    ownerPolicy('People manage their own profile', sql`${t.id} = ${authUid}`),
  ],
)

/** The sports a person plays and their skill tier in each. Tiers are per sport. */
export const playerSports = pgTable(
  'player_sports',
  {
    userId: text('user_id').notNull().default(callerId),
    sportId: text('sport_id').notNull(),
    tierId: text('tier_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.sportId] }),
    index('player_sports_sport_idx').on(t.sportId),
    ownerPolicy('People manage their own sports', sql`${t.userId} = ${authUid}`),
  ],
)
