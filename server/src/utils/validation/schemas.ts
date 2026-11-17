import { announcementLimits, accountingLimits, accountLimits, clubMemberRoles, feedbackLimits, feedbackQuestionKinds, type ClubMemberRole, type FeedbackQuestionKind, accountRoles, directoryLimits, handleRules, socialLimits, socialPlatforms, type SocialPlatform, clubBadgeLimits, clubBadgeMetrics, clubLimits, clubThemeLimits, feeCurrencies, gifSearch, tournamentLimits, matchmakingStrategyIds, sessionDefaults, sportRules, type CurrencyCode, type SportId } from '@matchpoynt/shared'
import { z } from 'zod'
import { limits } from '@/config/limits'

// Shape checks only. Rules (valid tiers, score values, court names) live in utils/session.

const sportIds = Object.keys(sportRules) as [SportId, ...SportId[]]
const memberRole = z.enum(Object.keys(clubMemberRoles) as [ClubMemberRole, ...ClubMemberRole[]])
const name = z.string().trim().min(1).max(sessionDefaults.maxNameLength)
const id = z.string().min(1).max(64)

const money = z.number({ error: 'Enter an amount of money, like 150 or 150.50.' })

/** A fee scheme's shape; utils/fees/rules decides whether its amounts make sense. */
export const feeSchema = z.object({
  kind: z.enum(['fixed', 'per-game', 'base-per-game']),
  currency: z.enum(Object.keys(feeCurrencies) as [CurrencyCode, ...CurrencyCode[]]),
  base: money,
  perGame: money,
  downpayment: money.optional(),
})
/** How a payment was made. */
export const paymentMethodSchema = z.enum(['cash', 'online'])
/** Recording a payment towards an invoice. */
export const invoicePaymentSchema = z.object({ amount: money, method: paymentMethodSchema })

/** No fee is `null`. Older clients that leave it out mean no fee too. */
const optionalFee = feeSchema
  .nullable()
  .optional()
  .transform((v) => v ?? null)

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
  fee: optionalFee,
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

export const uuidParam = z.uuid()

const optionalText = (max: number) => z.string().max(max).nullable().optional().transform((v) => v ?? null)

export const profileSchema = z.object({
  firstName: z.string().max(accountLimits.nameMaxLength),
  lastName: z.string().max(accountLimits.nameMaxLength),
  displayName: z.string().max(accountLimits.displayNameMaxLength).optional(),
  username: z.string().max(handleRules.maxLength * 2),
  phone: optionalText(accountLimits.phoneMaxLength),
  city: optionalText(accountLimits.cityMaxLength),
  role: z.enum(accountRoles),
  acceptTerms: z.boolean(),
  sports: z.array(z.object({ sportId: z.enum(sportIds), tierId: z.string().max(64) })).max(sportIds.length),
})

const email = z.email().max(254)
const password = z.string().min(1).max(128)

export const signUpSchema = z.object({ email, password, profile: profileSchema, next })
/** What someone signs in with: their email or their username (utils/auth/login.ts tells which). */
const login = z.string().trim().min(1, 'Enter your email or username.').max(254)
export const passwordSignInSchema = z.object({ email: login, password, next })
/** Email or username, like sign-in: the API sends the link to the account's email either way. */
export const forgotPasswordSchema = z.object({ email: login })
export const resetPasswordSchema = z.object({ password })
/** A new sign-in email: a link goes there, and the change happens once it's opened. */
export const changeEmailSchema = z.object({ email })

export const assignPlayerSchema = z.object({ playerId: z.uuid(), side: z.union([z.literal(0), z.literal(1)]) })

export const checkInSchema = z.object({ playerId: z.uuid() })

// Clubs. Lengths here only stop oversized bodies; the rules (utils/club/rules) give the user-facing limits.
export const clubInfoSchema = z.object({
  name: z.string().max(clubLimits.nameMaxLength * 2),
  handle: z.string().max(handleRules.maxLength * 2),
  description: z.string().max(clubLimits.descriptionMaxLength * 2).nullable(),
})

export const clubMemberSchema = z.object({
  name: z.string().max(sessionDefaults.maxNameLength * 2),
  userId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).nullable().optional(),
  contact: z.string().max(clubLimits.contactMaxLength * 2).nullable(),
  tiers: z.array(z.object({ sportId: z.enum(sportIds), tierId: z.string().max(64) })).max(sportIds.length * 2),
  role: memberRole.optional(),
})

export const plannedSessionSchema = z.object({
  ...settingsShape,
  title: z.string().max(clubLimits.titleMaxLength * 2),
  scheduledFor: z.string().max(64).nullable(),
  memberIds: z.array(z.string().max(64)).max(sessionDefaults.maxPlayers),
  signUp: z.enum(['approval', 'open']).optional(),
  maxPlayers: z.number().nullable().optional(),
})

/** A member signing up for a planned session (`true`) or taking themselves off it. */
export const planSignUpSchema = z.object({ going: z.boolean() })

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

export const clubFeeSchema = z.object({ fee: feeSchema.nullable() })

export const invoicePaidSchema = z.object({ paid: z.boolean(), method: paymentMethodSchema.optional() })

/** `GET /api/invoices?before=<ISO time>`: the next page of invoice groups. */

const themeColor = z.string().max(16).nullable()

export const clubThemeSchema = z.object({
  accent: themeColor,
  sidebar: themeColor,
  // Older clients send only accent and sidebar.
  page: themeColor.optional().transform((v) => v ?? null),
})

export const savedThemeSchema = z.object({ name: z.string().max(clubThemeLimits.nameMaxLength * 2), colors: clubThemeSchema })

// Club accounting. Shape only: utils/accounting/rules decides what's valid.
const optionalNote = (max: number) => z.string().max(max * 2).nullable()

export const billerSchema = z.object({
  name: z.string().max(accountingLimits.billerNameMaxLength * 2),
  contact: optionalNote(accountingLimits.contactMaxLength),
  notes: optionalNote(accountingLimits.notesMaxLength),
})

export const expenseSchema = z.object({
  description: z.string().max(accountingLimits.descriptionMaxLength * 2),
  amount: money,
  currency: z.enum(Object.keys(feeCurrencies) as [CurrencyCode, ...CurrencyCode[]]),
  spentOn: z.string().max(10),
  billerId: z.uuid().nullable(),
  sessionId: z.uuid().nullable(),
  notes: optionalNote(accountingLimits.notesMaxLength),
})

const day = z.string().max(10).optional()

/** `GET /api/accounting/:clubId/summary?from=&to=&tz=`: an optional date range and the viewer's time zone. */
export const accountingQuery = z.object({ from: day, to: day, tz: z.string().max(64).optional() })

/** `GET /api/accounting/:clubId/expenses`: a date range, a biller, and `global`, `session` or one session's id. */
export const expenseQuery = z.object({
  offset: z.string().optional(),
  from: day,
  to: day,
  biller: z.uuid().optional(),
  scope: z.union([z.enum(['global', 'session']), z.uuid()]).optional(),
})

export const manualInvoiceSchema = z.object({
  title: z.string().max(accountingLimits.invoiceTitleMaxLength * 2),
  notes: optionalNote(accountingLimits.notesMaxLength),
  currency: z.enum(Object.keys(feeCurrencies) as [CurrencyCode, ...CurrencyCode[]]),
  issuedOn: z.string().max(10),
  amount: money,
  split: z.enum(['each', 'total']),
  payers: z.array(z.object({ memberId: z.uuid().nullable(), name: z.string().max(120) })).max(accountingLimits.maxPayers * 2),
})

/** Creating a club with the step-by-step form: its info, and optionally its colours and fee scheme. */
export const createClubSchema = clubInfoSchema.extend({
  theme: clubThemeSchema.nullable().optional().transform((v) => v ?? null),
  fee: feeSchema.nullable().optional().transform((v) => v ?? null),
})

/** A club's or a person's links: the whole list, in order. */
export const socialLinksSchema = z.object({
  links: z
    .array(z.object({ platform: z.enum(Object.keys(socialPlatforms) as [SocialPlatform, ...SocialPlatform[]]), url: z.string().max(socialLimits.urlMaxLength * 2) }))
    .max(socialLimits.maxLinks * 2),
})

/** `?value=` of a handle or username check. */
export const nameCheckQuery = z.object({ value: z.string().max(handleRules.maxLength * 2) })

/** `POST /api/auth/lookup`: an email typed on the sign-in form. */
export const accountLookupSchema = z.object({ email: login })

/** `GET /api/profile/games?before=<ISO time>`. */
/** A page of the person's games, optionally only one sport's, one club's or one session's. */
export const profileGamesQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  sport: z.enum(Object.keys(sportRules) as [SportId, ...SportId[]]).optional(),
  club: z.uuid().optional(),
  session: z.uuid().optional(),
})

const webLink = z.object({ label: z.string().max(directoryLimits.linkLabelMaxLength * 2), url: z.string().max(socialLimits.urlMaxLength * 2) })

export const clubJoiningSchema = z.object({
  approval: z.enum(['auto', 'manual']),
  welcomeMessage: z.string().max(directoryLimits.welcomeMaxLength * 2).nullable(),
  welcomeLinks: z.array(webLink).max(directoryLimits.welcomeLinks * 2),
})

/** Approving or declining a request. */
export const decisionSchema = z.object({ approve: z.boolean() })

/** `?offset=` of a page of a list. */
export const pageOffset = z.coerce.number().int().min(0).max(100_000)

/** `GET /api/directory?q=&offset=`. */
export const directoryQuery = z.object({ q: z.string().max(60).default(''), offset: pageOffset.default(0) })

/** A club handle in a link (`/c/<handle>`, `/join/<handle>`). */
export const handleParam = z.string().regex(/^@?[A-Za-z0-9._]{3,30}$/)

/** `GET /api/people/search?q=&club=`. */
export const peopleQuery = z.object({ q: z.string().max(60), club: z.uuid().optional() })

export const sessionJoinSchema = z.object({ planId: z.uuid().nullable(), sessionId: z.uuid().nullable() })

export const inviteAnswerSchema = z.object({ accept: z.boolean() })

/** A club's feedback form; utils/club/feedback.ts decides whether its questions make sense. */
/** Starting (`true`) or ending a player's break. */
export const breakSchema = z.object({ onBreak: z.boolean() })

/** Posting or editing a club announcement; `cleanAnnouncement` trims and checks the lengths. */
export const announcementSchema = z.object({
  title: z.string().max(announcementLimits.titleMaxLength * 2),
  body: z.string().max(announcementLimits.bodyMaxLength * 2),
  pinned: z.boolean(),
})

export const feedbackFormSchema = z.object({
  title: z.string().max(feedbackLimits.titleMaxLength * 2),
  intro: z.string().max(feedbackLimits.introMaxLength * 2),
  enabled: z.boolean(),
  questions: z
    .array(
      z.object({
        id: z.string().max(64),
        kind: z.enum(Object.keys(feedbackQuestionKinds) as [FeedbackQuestionKind, ...FeedbackQuestionKind[]]),
        prompt: z.string().max(feedbackLimits.promptMaxLength * 2),
        required: z.boolean(),
        options: z.array(z.string().max(feedbackLimits.optionMaxLength * 2)).max(feedbackLimits.maxOptions * 2),
      }),
    )
    .max(feedbackLimits.maxQuestions * 2),
})

/** A member's answers about one session; checked against the form by utils/club/feedback.ts. */
export const feedbackSubmitSchema = z.object({
  sessionId: z.uuid(),
  answers: z
    .array(z.object({ questionId: z.string().max(64), value: z.union([z.number(), z.string().max(feedbackLimits.textAnswerMaxLength * 2), z.boolean()]) }))
    .max(feedbackLimits.maxQuestions * 2),
})

/** A friend request: the account it's for (picked from the people search). */
export const friendRequestSchema = z.object({ userId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) })

export const friendSearchQuery = z.object({ q: z.string().max(60) })
