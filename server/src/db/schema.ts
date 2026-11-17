import { sql } from 'drizzle-orm'
import { boolean, check, date, index, integer, jsonb, pgPolicy, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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
    /** Unique "@" handle, lower case, without the "@"; null for clubs made before handles. */
    handle: text(),
    description: text(),
    /** [{ platform, url }] (utils/social/links.ts). */
    socialLinks: jsonb('social_links').notNull().default(sql`'[]'::jsonb`),
    /** How people join: `auto` (at once) or `manual` (the owner approves). */
    joinApproval: text('join_approval').notNull().default('manual'),
    welcomeMessage: text('welcome_message'),
    /** [{ label, url }] shown to new members. */
    welcomeLinks: jsonb('welcome_links').notNull().default(sql`'[]'::jsonb`),
    avatarPath: text('avatar_path'),
    coverPath: text('cover_path'),
    /** How each photo sits in its frame: { x, y, zoom } (utils/club/appearance.ts); null = centred. */
    avatarPosition: jsonb('avatar_position'),
    coverPosition: jsonb('cover_position'),
    /** The club's colours for the app: { accent, sidebar, page } as hex; null = Matchpoynt's own. */
    theme: jsonb(),
    /** The club's saved colour combinations: [{ id, name, colors }] (utils/club/appearance.ts). */
    savedThemes: jsonb('saved_themes').notNull().default(sql`'[]'::jsonb`),
    /** QR codes players pay with (an e-wallet, a bank): [{ id, label, path }] in club-media; shown to members who still owe. */
    paymentQrs: jsonb('payment_qrs').notNull().default(sql`'[]'::jsonb`),
    /** The club's fee scheme, offered when setting up its sessions: { kind, currency, base, perGame } (utils/fees/rules.ts); null = no fee. */
    fee: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('clubs_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('clubs_join_approval_check', sql`${t.joinApproval} in ('auto', 'manual')`),
    check('clubs_welcome_message_check', sql`char_length(${t.welcomeMessage}) <= 1000`),
    check('clubs_handle_check', sql`${t.handle} ~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$' and char_length(${t.handle}) between 3 and 30`),
    uniqueIndex('clubs_handle_idx').on(t.handle),
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
    /** What they do in the club, given by the owner (`clubMemberRoles` in shared/src/config/club.ts). */
    role: text().notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_members_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('club_members_role_check', sql`${t.role} in ('member', 'captain', 'coach', 'queue_master', 'manager')`),
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
    /** Where an email invite went; null for one sent in the app. */
    email: text(),
    /** The account an in-app invite is for (picked from the member search); null for email invites. */
    userId: text('user_id'),
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
    index('club_invites_user_idx').on(t.userId),
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
    /** The joining fee the session will charge; null = no fee. */
    fee: jsonb(),
    coverPath: text('cover_path'),
    /** How members get on the roster: 'approval' (they ask, the owner approves) or 'open' (they sign themselves up). */
    signUp: text('sign_up').notNull().default('approval'),
    /** Most players the roster takes; null for no cap. */
    maxPlayers: integer('max_players'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('planned_sessions_sign_up_check', sql`${t.signUp} in ('approval', 'open')`),
    check('planned_sessions_max_players_check', sql`${t.maxPlayers} is null or ${t.maxPlayers} between 2 and 200`),
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
    /** The joining fee players are invoiced when it ends; null = no fee. Saved by save_session only when the save carries it. */
    fee: jsonb(),
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
    /** When they started a break; null while they're not on one. Players on a break sit out the queue. */
    breakSince: timestamp('break_since', { withTimezone: true }),
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
 * What one player owes for a finished session, written by end_session from
 * the session's fee (utils/fees/invoices.ts) and then only marked paid or unpaid.
 * Amounts are minor units of `currency`.
 */
export const sessionInvoices = pgTable(
  'session_invoices',
  {
    id: uuid().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => sessionPlayers.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    games: integer().notNull(),
    amount: integer().notNull(),
    currency: text().notNull(),
    /** When it was paid in full; `null` until its payments cover it. */
    paidAt: timestamp('paid_at', { withTimezone: true }),
    /** Every payment towards it: [{ id, amount, method: 'cash' | 'online', paidAt }], oldest first. */
    payments: jsonb().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('session_invoices_games_check', sql`${t.games} >= 0`),
    check('session_invoices_amount_check', sql`${t.amount} >= 0`),
    check('session_invoices_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    uniqueIndex('session_invoices_player_idx').on(t.sessionId, t.playerId),
    ownerPolicy('Owners manage their invoices', ownsSession(t.sessionId)),
  ],
)

/** Someone a club pays (a venue, a supplier, a coach), listed by the club so expenses can be linked to them. */
export const clubBillers = pgTable(
  'club_billers',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    contact: text(),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_billers_name_check', sql`char_length(${t.name}) between 1 and 80`),
    check('club_billers_contact_check', sql`char_length(${t.contact}) <= 120`),
    check('club_billers_notes_check', sql`char_length(${t.notes}) <= 500`),
    index('club_billers_club_idx').on(t.clubId),
    ownerPolicy('Owners manage their club billers', ownsClub(t.clubId)),
  ],
)

/**
 * Money a club spent: club-wide (no session) or for one of its sessions,
 * optionally paid to one of its billers. Amounts are minor units of `currency`.
 * Deleting the biller or the session keeps the expense (club-wide, no biller).
 */
export const clubExpenses = pgTable(
  'club_expenses',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    billerId: uuid('biller_id').references(() => clubBillers.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    description: text().notNull(),
    amount: integer().notNull(),
    currency: text().notNull(),
    spentOn: date('spent_on').notNull(),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_expenses_description_check', sql`char_length(${t.description}) between 1 and 120`),
    check('club_expenses_notes_check', sql`char_length(${t.notes}) <= 500`),
    check('club_expenses_amount_check', sql`${t.amount} > 0`),
    check('club_expenses_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    index('club_expenses_club_idx').on(t.clubId, t.spentOn.desc()),
    index('club_expenses_session_idx').on(t.sessionId),
    ownerPolicy('Owners manage their club expenses', ownsClub(t.clubId)),
  ],
)

/**
 * An invoice a club makes by hand, outside its sessions: what it's for, its
 * amount (each payer's, or a total shared between them) and its payers.
 */
export const clubInvoices = pgTable(
  'club_invoices',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    notes: text(),
    currency: text().notNull(),
    issuedOn: date('issued_on').notNull(),
    /** As entered: each payer's amount (`each`) or the total shared (`total`), minor units. */
    amount: integer().notNull(),
    split: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_invoices_title_check', sql`char_length(${t.title}) between 1 and 120`),
    check('club_invoices_notes_check', sql`char_length(${t.notes}) <= 500`),
    check('club_invoices_amount_check', sql`${t.amount} > 0`),
    check('club_invoices_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check('club_invoices_split_check', sql`${t.split} in ('each', 'total')`),
    index('club_invoices_club_idx').on(t.clubId, t.issuedOn.desc()),
    ownerPolicy('Owners manage their club invoices', ownsClub(t.clubId)),
  ],
)

/** One payer on a manual invoice: a club member or a name, what they owe, and when they paid. */
export const clubInvoicePayers = pgTable(
  'club_invoice_payers',
  {
    id: uuid().primaryKey(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => clubInvoices.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => clubMembers.id, { onDelete: 'set null' }),
    name: text().notNull(),
    amount: integer().notNull(),
    position: integer().notNull(),
    /** When they paid in full; `null` until their payments cover it. */
    paidAt: timestamp('paid_at', { withTimezone: true }),
    /** Every payment towards it, as on session invoices. */
    payments: jsonb().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [
    check('club_invoice_payers_name_check', sql`char_length(${t.name}) between 1 and 60`),
    check('club_invoice_payers_amount_check', sql`${t.amount} >= 0`),
    index('club_invoice_payers_invoice_idx').on(t.invoiceId),
    ownerPolicy(
      'Owners manage their club invoice payers',
      sql`exists (select 1 from public.club_invoices i join public.clubs k on k.id = i.club_id where i.id = ${t.invoiceId} and k.owner_id = ${authUid})`,
    ),
  ],
)

/** Someone asking to join a club. `request_join_club` makes it (and approves it at once when the club joins automatically). */
export const clubJoinRequests = pgTable(
  'club_join_requests',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    /** Their username when they asked, the name they join the roster with. */
    name: text().notNull(),
    /** Their skill tiers when they asked: [{ sportId, tierId }]. */
    tiers: jsonb().notNull().default(sql`'[]'::jsonb`),
    /** Their profile photo when they asked, for the owner's list. */
    avatarPath: text('avatar_path'),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    check('club_join_requests_status_check', sql`${t.status} in ('pending', 'approved', 'declined')`),
    uniqueIndex('club_join_requests_pending_idx').on(t.clubId, t.userId).where(sql`${t.status} = 'pending'`),
    ownerPolicy('Owners manage their club join requests', ownsClub(t.clubId)),
  ],
)

/** A member asking to join one of the club's sessions: a planned one or one running now. The owner decides. */
export const sessionJoinRequests = pgTable(
  'session_join_requests',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => clubMembers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plannedSessions.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    check('session_join_requests_status_check', sql`${t.status} in ('pending', 'approved', 'declined')`),
    check('session_join_requests_target_check', sql`(${t.planId} is null) <> (${t.sessionId} is null)`),
    index('session_join_requests_club_idx').on(t.clubId, t.status),
    ownerPolicy('Owners manage their session join requests', ownsClub(t.clubId)),
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
    /** Unique, lower case, without the "@". Required (utils/profile/rules.ts), so older profiles are asked for one. Also the display name. */
    username: text(),
    /** The sign-in email, copied from the token on every profile save, so club owners can find people by it. */
    email: text(),
    /** Profile photo in the `club-media` bucket, `<uid>/profile/avatar-<uuid>.webp`, and how it sits in its circle. */
    avatarPath: text('avatar_path'),
    avatarPosition: jsonb('avatar_position'),
    /** [{ platform, url }] (utils/social/links.ts). */
    socialLinks: jsonb('social_links').notNull().default(sql`'[]'::jsonb`),
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
    check('profiles_username_check', sql`${t.username} ~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$' and char_length(${t.username}) between 3 and 30`),
    uniqueIndex('profiles_username_idx').on(t.username),
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

/**
 * A club's post-session feedback form: one per club, built by its owner.
 * Members answer it for each finished session they played in
 * (`submit_club_feedback`), for `feedbackLimits.answerWindowDays` days.
 */
export const clubFeedbackForms = pgTable(
  'club_feedback_forms',
  {
    clubId: uuid('club_id')
      .primaryKey()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    intro: text().notNull().default(''),
    enabled: boolean().notNull().default(false),
    /** [{ id, kind, prompt, required, options }] (utils/club/feedback.ts). */
    questions: jsonb().notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_feedback_forms_title_check', sql`char_length(${t.title}) between 1 and 80`),
    check('club_feedback_forms_intro_check', sql`char_length(${t.intro}) <= 500`),
    ownerPolicy('Owners manage their club feedback form', ownsClub(t.clubId)),
  ],
)

/** News a club's owner posts for its members: pinned ones first. Members read them through `club_announcements_for`. */
export const clubAnnouncements = pgTable(
  'club_announcements',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    body: text().notNull().default(''),
    pinned: boolean().notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('club_announcements_title_check', sql`char_length(${t.title}) between 1 and 80`),
    check('club_announcements_body_check', sql`char_length(${t.body}) <= 2000`),
    index('club_announcements_club_idx').on(t.clubId, t.createdAt),
    ownerPolicy('Owners manage their club announcements', ownsClub(t.clubId)),
  ],
)

/** One member's answers about one session. Written by `submit_club_feedback`; the owner reads them. */
export const clubFeedbackResponses = pgTable(
  'club_feedback_responses',
  {
    id: uuid().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    /** Their name on the club's roster when they answered. */
    memberName: text('member_name').notNull(),
    /** [{ questionId, value }], checked against the form by the API. */
    answers: jsonb().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('club_feedback_responses_once_idx').on(t.sessionId, t.userId),
    index('club_feedback_responses_club_idx').on(t.clubId, t.sessionId),
    // Only `submit_club_feedback` writes answers; owners read them and can delete one.
    pgPolicy('Owners read their club feedback', { for: 'select', to: authenticatedRole, using: ownsClub(t.clubId) }),
    pgPolicy('Owners delete their club feedback', { for: 'delete', to: authenticatedRole, using: ownsClub(t.clubId) }),
  ],
)

/**
 * Two people who added each other. The requester asks; the addressee
 * accepts (`accept_friend_request`: status `accepted`) or declines (the row is deleted). Either can
 * remove it. One row per pair, whichever way it was asked.
 */
export const friendships = pgTable(
  'friendships',
  {
    id: uuid().primaryKey(),
    requesterId: text('requester_id').notNull().default(callerId),
    addresseeId: text('addressee_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => [
    check('friendships_status_check', sql`${t.status} in ('pending', 'accepted')`),
    check('friendships_self_check', sql`${t.requesterId} <> ${t.addresseeId}`),
    uniqueIndex('friendships_pair_idx').using('btree', sql`least(${t.requesterId}, ${t.addresseeId})`, sql`greatest(${t.requesterId}, ${t.addresseeId})`),
    index('friendships_addressee_idx').on(t.addresseeId),
    pgPolicy('People see their own friendships', { for: 'select', to: authenticatedRole, using: sql`${authUid} in (${t.requesterId}, ${t.addresseeId})` }),
    pgPolicy('People ask others to be friends', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.requesterId} = ${authUid} and ${t.status} = 'pending'`,
    }),
    // No update policy: accepting goes through `accept_friend_request`, so nobody can rewrite who asked whom.
    pgPolicy('Either friend can remove a friendship', { for: 'delete', to: authenticatedRole, using: sql`${authUid} in (${t.requesterId}, ${t.addresseeId})` }),
  ],
)
