import { accountLimits, accountRoles, clubBadgeLimits, clubBadgeMetrics, clubLimits, gifSearch, tournamentLimits, matchmakingStrategyIds, sessionDefaults, sportRules, type SportId } from '@matchpoynt/shared'
import { z } from 'zod'
import { limits } from '@/config/limits'

// Shape checks only. Rules (valid tiers, score values, court names) live in utils/session.

const sportIds = Object.keys(sportRules) as [SportId, ...SportId[]]
const name = z.string().trim().min(1).max(sessionDefaults.maxNameLength)
const id = z.string().min(1).max(64)

const settingsShape = {
  sportId: z.enum(sportIds),
  scoring: z.object({ formatId: z.string().max(64), matchFormat: z.enum(['singles', 'doubles', 'team']) }),
  rules: z.object({
    queueing: z.enum(['automatic', 'manual']),
    autoFill: z.boolean(),
    timeLimitMinutes: z.number().nullable(),
    lateJoiners: z.enum(['fair', 'priority']),
  }),
  matchmaking: z.enum(matchmakingStrategyIds as [string, ...string[]]).transform((v) => v as (typeof matchmakingStrategyIds)[number]),
  courts: z.array(z.object({ id, label: z.string().max(sessionDefaults.maxNameLength) })).max(sessionDefaults.maxCourts),
}

export const setupSchema = z.object({
  ...settingsShape,
  members: z
    .array(z.object({ id, name: z.string().max(sessionDefaults.maxNameLength), tierId: z.string().max(64), checkedIn: z.boolean().optional() }))
    .max(sessionDefaults.maxPlayers),
})

export const addPlayerSchema = z.object({ name, tierId: z.string().min(1).max(64), checkedIn: z.boolean().optional() })

const score = z.number().int().min(0).max(limits.maxScore)
export const finishMatchSchema = z.object({ games: z.array(z.object({ a: score, b: score })).max(7) })

/** Page to return to after signing in; the API checks it against its allow-list (utils/auth/returnTo). */
const next = z.string().max(200).optional()

export const emailSignInSchema = z.object({ email: z.email().max(254), next })

export const uuidParam = z.uuid()

const optionalText = (max: number) => z.string().max(max).nullable().optional().transform((v) => v ?? null)

export const profileSchema = z.object({
  firstName: z.string().max(accountLimits.nameMaxLength),
  lastName: z.string().max(accountLimits.nameMaxLength),
  displayName: z.string().max(accountLimits.displayNameMaxLength),
  phone: optionalText(accountLimits.phoneMaxLength),
  city: optionalText(accountLimits.cityMaxLength),
  role: z.enum(accountRoles),
  acceptTerms: z.boolean(),
  sports: z.array(z.object({ sportId: z.enum(sportIds), tierId: z.string().max(64) })).max(sportIds.length),
})

const email = z.email().max(254)
const password = z.string().min(1).max(128)

export const signUpSchema = z.object({ email, password, profile: profileSchema })
export const passwordSignInSchema = z.object({ email, password, next })
export const forgotPasswordSchema = z.object({ email })
export const resetPasswordSchema = z.object({ password })

export const assignPlayerSchema = z.object({ playerId: z.uuid(), side: z.union([z.literal(0), z.literal(1)]) })

export const checkInSchema = z.object({ playerId: z.uuid() })

// Clubs. Lengths here only stop oversized bodies; the rules (utils/club/rules) give the user-facing limits.
export const clubInfoSchema = z.object({
  name: z.string().max(clubLimits.nameMaxLength * 2),
  description: z.string().max(clubLimits.descriptionMaxLength * 2).nullable(),
})

export const clubMemberSchema = z.object({
  name: z.string().max(sessionDefaults.maxNameLength * 2),
  contact: z.string().max(clubLimits.contactMaxLength * 2).nullable(),
  tiers: z.array(z.object({ sportId: z.enum(sportIds), tierId: z.string().max(64) })).max(sportIds.length * 2),
})

export const plannedSessionSchema = z.object({
  ...settingsShape,
  title: z.string().max(clubLimits.titleMaxLength * 2),
  scheduledFor: z.string().max(64).nullable(),
  memberIds: z.array(z.string().max(64)).max(sessionDefaults.maxPlayers),
})

export const clubImageKind = z.enum(['avatar', 'cover'])

const badgeMetric = z.enum(Object.keys(clubBadgeMetrics) as [keyof typeof clubBadgeMetrics, ...(keyof typeof clubBadgeMetrics)[]])

export const clubBadgeSchema = z.object({
  name: z.string().max(clubBadgeLimits.nameMaxLength * 2),
  description: z.string().max(clubBadgeLimits.descriptionMaxLength * 2).nullable(),
  scope: z.enum(['session', 'career']),
  conditions: z.array(z.object({ metric: badgeMetric, min: z.number() })).max(clubBadgeLimits.maxConditions * 2),
})

/** A GIPHY GIF id (letters and digits). */
export const badgeIconFromGifSchema = z.object({ gifId: z.string().regex(/^[A-Za-z0-9]{1,64}$/) })

export const gifSearchQuery = z.object({
  q: z.string().max(gifSearch.maxQueryLength * 2).default(''),
  offset: z.coerce.number().int().min(0).max(4999).default(0),
})

// Tournaments. Shape only: utils/tournament decides what makes a valid tournament.
export const tournamentSetupSchema = z.object({
  courtId: z.uuid(),
  name: z.string().max(tournamentLimits.nameMaxLength * 2),
  format: z.enum(['single-elimination', 'double-elimination', 'round-robin', 'pools-knockout']),
  teamMode: z.enum(['fixed', 'rotating']),
  teamBuild: z.enum(['manual', 'random', 'balanced']),
  playerIds: z.array(z.uuid()).max(sessionDefaults.maxPlayers),
  teams: z.array(z.array(z.uuid()).max(12)).max(sessionDefaults.maxPlayers),
  seeding: z.enum(['tier', 'random']),
  pools: z.object({ count: z.number().int().min(0).max(64), advance: z.number().int().min(0).max(64) }),
  rounds: z.number().int().min(0).max(100),
})

export const courtTournamentSchema = z.object({ on: z.boolean() })

export const tournamentCompetitorsSchema = z.object({ playerIds: z.array(z.uuid()).max(sessionDefaults.maxPlayers) })

/** Tournament match ids are generated by the bracket, e.g. "W2-1", "P1-R3-0", "GF2". */
export const tournamentMatchParam = z.string().regex(/^[A-Z][A-Z0-9-]{0,15}$/)

/** Name suggestions: what was typed, the session's sport, and names already taken (setup drafts). */
export const memberSuggestionQuery = z.object({
  q: z.string().max(60),
  sportId: z.enum(sportIds),
  sessionId: z.uuid().optional(),
  exclude: z.array(z.string().max(sessionDefaults.maxNameLength * 2)).max(sessionDefaults.maxPlayers),
})

export const sendInviteSchema = z.object({ email: z.email().max(254) })

export const acceptInviteSchema = z.object({ password: z.string().max(128).nullable(), profile: profileSchema.nullable() })

/** Invite tokens are 22-character URL-safe strings. */
export const inviteToken = z.string().regex(/^[A-Za-z0-9_-]{22}$/)

/** `GET /api/sessions/ended?before=<ISO time>`: the next page of past sessions. */
export const endedSessionsQuery = z.object({ before: z.iso.datetime({ offset: true }).optional() })

export const photoPositionSchema = z.object({ x: z.number(), y: z.number(), zoom: z.number() })

export const clubThemeSchema = z.object({ accent: z.string().max(16).nullable(), sidebar: z.string().max(16).nullable() })
