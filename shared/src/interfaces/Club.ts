import type { ClubBadgeIconSource, ClubBadgeMetric, ClubBadgeScope, ClubMemberRole, ClubSessionStatus, ClubSetupItemId, PlanSignUp } from '../types/club.ts'
import type { ProfileInput } from './Account.ts'
import type { FeeScheme } from './Fee.ts'
import type { SocialLink } from './Social.ts'
import type { ClubJoiningInput, JoinRequestView, SessionRequestView } from './Directory.ts'
import type { CourtSetup, SessionSettings } from './Session.ts'
import type { SportId } from '../types/sport.ts'

/** Body of creating a club or editing its info. */
export interface ClubInfoInput {
  name: string
  /** The club's unique handle, without the "@" (e.g. "riverside"). */
  handle: string
  description: string | null
}

/** Body of creating a club with the step-by-step form: its info, plus colours and a fee scheme (`null` for the defaults). */
export interface CreateClubInput extends ClubInfoInput {
  theme: ClubThemeInput | null
  fee: FeeScheme | null
}

/** One thing a new club can still set up, as the dashboard's checklist lists them. Which ones are done is decided by the API. */
export interface ClubSetupItem {
  id: ClubSetupItemId
  done: boolean
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
  /** The centre panel's background (the page itself). Its text, cards and borders are worked out from it. */
  page: string | null
}

/** A club's own colour combination, saved by name and offered beside the presets. */
export interface SavedClubTheme {
  id: string
  name: string
  colors: ClubThemeInput
}

/** Body of saving the colours as a named theme. */
export interface SavedThemeInput {
  name: string
  colors: ClubThemeInput
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
  /** The centre panel and what sits on it: its background and text, cards (and menus) with their text, muted fills and text, and borders. */
  page: string | null
  pageForeground: string | null
  pageMuted: string | null
  pageMutedForeground: string | null
  card: string | null
  cardForeground: string | null
  border: string | null
}

/** A club as listed on the Clubs page. */
export interface ClubSummary {
  id: string
  name: string
  /** Its unique "@" handle, without the "@"; `null` for clubs made before handles existed (their dashboard asks for one). */
  handle: string | null
  /** Its social and web links, in order. */
  socialLinks: SocialLink[]
  /** How people join, and the welcome they get. */
  joining: ClubJoiningInput
  description: string | null
  /** Photos are served by the API at `/api/media/...`; `null` when not set. */
  avatarUrl: string | null
  coverUrl: string | null
  avatarPosition: PhotoPosition
  coverPosition: PhotoPosition
  /** The club's colours for the app; `null` for Matchpoynt's own. */
  theme: ClubTheme | null
  /** The club's saved colour combinations, oldest first. */
  savedThemes: SavedClubTheme[]
  /** QR codes players pay the club with (an e-wallet, a bank), shown to members who still owe; empty while fees are off. */
  paymentQrs: PaymentQrView[]
  /** The club's saved fee scheme, offered when setting up its sessions; `null` for none (and while fees are switched off). */
  fee: FeeScheme | null
  /** The fee in words, written by the API, e.g. "₱150.00 per player"; `null` without one. */
  feeSummary: string | null
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
  /** Someone on Matchpoynt picked from the search: they're invited in the app to link their account. Adding only. */
  userId?: string | null
  /** Email, phone or anything the manager uses to reach them. */
  contact: string | null
  tiers: MemberTier[]
  /** What they do in the club; left out, a new member is a `member` and an edit keeps theirs. */
  role?: ClubMemberRole
}

export interface ClubMemberView extends ClubMemberInput {
  id: string
  role: ClubMemberRole
  /** Where their invite went, if they've been invited. */
  email: string | null
  /** They accepted an invite: the member is linked to their own account. */
  linked: boolean
  /** The latest invite still open or accepted; `null` when never invited (or it was cancelled). `app`: sent in the app, not by email. */
  invite: { status: 'pending' | 'accepted'; sentAt: string; via: 'email' | 'app' } | null
  /** Their account's @username and photo, once linked. */
  username: string | null
  avatarUrl: string | null
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
  /** How members get on the roster: by asking (`approval`) or signing themselves up (`open`). Left out, `approval`. */
  signUp?: PlanSignUp
  /** Most players the roster takes (open sign-up stops there); `null` for no cap. */
  maxPlayers?: number | null
}

export interface PlannedSessionView extends PlannedSessionInput {
  id: string
  signUp: PlanSignUp
  maxPlayers: number | null
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
/** A QR code players pay the club with, labelled by what it's for (e.g. "GCash", "BPI"). */
export interface PaymentQrView {
  id: string
  label: string
  url: string
  /** How it's framed in its square (set when uploading, like club photos). */
  position: PhotoPosition
}

export interface ClubView {
  club: ClubSummary
  members: ClubMemberView[]
  planned: PlannedSessionView[]
  sessions: ClubSessionView[]
  /** The club's own badges; empty while club badges are switched off. */
  badges: ClubBadgeView[]
  /** What's set up and what's still missing, in the order to do it. */
  setup: ClubSetupItem[]
  /** People asking to join the club, oldest first. */
  joinRequests: JoinRequestView[]
  /** Members asking to join one of its sessions, oldest first. */
  sessionRequests: SessionRequestView[]
  /** Pass as `before` to `GET /api/clubs/:id/sessions` for older sessions than `sessions` shows; `null` when there are none. */
  sessionsNextBefore: string | null
}

/** A page of the club's sessions, newest first (`GET /api/clubs/:id/sessions?before=`). */
export interface ClubSessionsResponse {
  sessions: ClubSessionView[]
  nextBefore: string | null
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
  /** Pass as `offset` for the next page; `null` at the end. */
  nextOffset: number | null
}

/** A club member suggested while typing a player's name. */
export interface MemberSuggestion {
  memberId: string
  name: string
  /** Their linked account's @username, the email on file, and photo, when known. */
  username: string | null
  email: string | null
  avatarUrl: string | null
  /** Their tier in the session's sport, or `null` if not set (the form keeps its own choice). */
  tierId: string | null
  clubName: string
}

export interface MemberSuggestionsResponse {
  suggestions: MemberSuggestion[]
}
