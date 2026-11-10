import type { ClubBadgeIconSource, ClubBadgeMetric, ClubBadgeScope, ClubSessionStatus } from '../types/club.ts'
import type { ProfileInput } from './Account.ts'
import type { CourtSetup, SessionSettings } from './Session.ts'
import type { SportId } from '../types/sport.ts'

/** Body of creating a club or editing its info. */
export interface ClubInfoInput {
  name: string
  description: string | null
}

/**
 * How a photo sits in its frame: the point (percent across and down the
 * photo) kept in view, and how far it's zoomed in (1 = fills the frame).
 */
export interface PhotoPosition {
  x: number
  y: number
  zoom: number
}

/** Body of setting a club's colours: hex colours like "#f05a1a", or `null` for Matchpoynt's own. */
export interface ClubThemeInput {
  accent: string | null
  sidebar: string | null
}

/**
 * A club's colours, ready to use: the API picks readable text colours for
 * each and the sidebar's hover and border shades. Hex or rgba() strings.
 */
export interface ClubTheme {
  colors: ClubThemeInput
  accent: string | null
  accentForeground: string | null
  sidebar: string | null
  sidebarForeground: string | null
  sidebarAccent: string | null
  sidebarAccentForeground: string | null
  sidebarBorder: string | null
}

/** A club as listed on the Clubs page. */
export interface ClubSummary {
  id: string
  name: string
  description: string | null
  /** Photos are served by the API at `/api/media/...`; `null` when not set. */
  avatarUrl: string | null
  coverUrl: string | null
  avatarPosition: PhotoPosition
  coverPosition: PhotoPosition
  /** The club's colours for the app; `null` for Matchpoynt's own. */
  theme: ClubTheme | null
  members: number
  plannedSessions: number
}

/** A member's skill tier in one sport. */
export interface MemberTier {
  sportId: SportId
  tierId: string
}

/** Body of adding or editing a club member. A named roster entry: members don't need accounts. */
export interface ClubMemberInput {
  name: string
  /** Email, phone or anything the manager uses to reach them. */
  contact: string | null
  tiers: MemberTier[]
}

export interface ClubMemberView extends ClubMemberInput {
  id: string
  /** Where their invite went, if they've been invited. */
  email: string | null
  /** They accepted an invite: the member is linked to their own account. */
  linked: boolean
  /** The latest invite still open or accepted; `null` when never invited (or it was cancelled). */
  invite: { status: 'pending' | 'accepted'; sentAt: string } | null
  /** Ids of the club's career badges this member has earned (from every club session, matched by name). */
  badges: string[]
}

/** Body of inviting a member: where to send their sign-in link. */
export interface SendInviteInput {
  email: string
}

/** What an invite link shows the person who opened it. */
export interface InviteView {
  clubName: string
  clubAvatarUrl: string | null
  memberName: string
  email: string
  status: 'pending' | 'accepted' | 'revoked'
  /** Signed in with the email it was sent to. */
  forYou: boolean
  /** The signed-in account is the one linked to the member already. */
  acceptedByYou: boolean
  signedInAs: string | null
  /** No complete profile yet (a new account from the link): accepting needs the sign-up form and a password. */
  needsSignUp: boolean
}

/** Body of accepting an invite. New accounts send their profile and a password; existing ones send neither. */
export interface AcceptInviteInput {
  password: string | null
  profile: ProfileInput | null
}

export interface AcceptInviteResponse {
  clubName: string
  /** Where to go next. */
  redirectTo: string
}

/** Body of planning a session ahead of time. */
export interface PlannedSessionInput extends SessionSettings {
  title: string
  /** ISO date and time it's planned for; `null` when not decided. */
  scheduledFor: string | null
  courts: CourtSetup[]
  /** Club members on the roster. Their names and tiers are read when the session starts. */
  memberIds: string[]
}

export interface PlannedSessionView extends PlannedSessionInput {
  id: string
  coverUrl: string | null
}

/** A session the club has run (or is running), for its card on the club page. */
export interface ClubSessionView {
  id: string
  title: string | null
  sportId: SportId
  status: Exclude<ClubSessionStatus, 'planned'>
  startedAt: string
  endedAt: string | null
  coverUrl: string | null
}

/** Everything the club manager page shows. */
export interface ClubView {
  club: ClubSummary
  members: ClubMemberView[]
  planned: PlannedSessionView[]
  sessions: ClubSessionView[]
  /** The club's own badges; empty while club badges are switched off. */
  badges: ClubBadgeView[]
}

/** One condition of a club badge: `metric` must be at least `min`. */
export interface ClubBadgeCondition {
  metric: ClubBadgeMetric
  min: number
}

/** Body of creating or editing a club badge. Its icon is set separately (upload or GIF). */
export interface ClubBadgeInput {
  name: string
  description: string | null
  scope: ClubBadgeScope
  /** All must be met. */
  conditions: ClubBadgeCondition[]
}

/** A club badge, as the club page and leaderboards show it. */
export interface ClubBadgeView extends ClubBadgeInput {
  id: string
  /** The icon (`/api/media/...`): an animated GIF or a still image; `null` until one is set. */
  iconUrl: string | null
  iconSource: ClubBadgeIconSource | null
  /** Plain-language conditions, written by the API, e.g. "At least 5 wins and 60% win rate in one session". */
  summary: string
}

/** Body of using a GIF from search as a badge icon. */
export interface BadgeIconFromGifInput {
  gifId: string
}

/** One GIF search result. The preview loads from GIPHY's media host. */
export interface GifResult {
  id: string
  title: string
  previewUrl: string
  width: number
  height: number
}

export interface GifSearchResponse {
  results: GifResult[]
  /** Offset of the next page; `null` at the end. */
  nextOffset: number | null
  attribution: string
}

export interface ClubListResponse {
  clubs: ClubSummary[]
}

/** A club member suggested while typing a player's name. */
export interface MemberSuggestion {
  memberId: string
  name: string
  /** Their tier in the session's sport, or `null` if not set (the form keeps its own choice). */
  tierId: string | null
  clubName: string
}

export interface MemberSuggestionsResponse {
  suggestions: MemberSuggestion[]
}
