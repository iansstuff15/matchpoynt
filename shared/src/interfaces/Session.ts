import type { ClubBadgeView } from './Club.ts'
import type { FeeScheme } from './Fee.ts'
import type { CourtSide, CourtStatus, LateJoinerPlacement, LeaderboardBadgeId, MatchSide, MatchmakingStrategyId, QueueingMode } from '../types/session.ts'
import type { MatchFormat, SportId } from '../types/sport.ts'
import type { TournamentView } from './Tournament.ts'

export interface ScoringSettings {
  /** Id of a `ScoringFormat` in the sport's rules. */
  formatId: string
  matchFormat: MatchFormat
}

export interface SessionRules {
  queueing: QueueingMode
  /** Fill open courts from the queue as soon as enough players are waiting. */
  autoFill: boolean
  /** Flag matches that run past this many minutes; `null` for no limit. */
  timeLimitMinutes: number | null
  lateJoiners: LateJoinerPlacement
}

/** Settings that shape a whole session. */
export interface SessionSettings {
  sportId: SportId
  scoring: ScoringSettings
  rules: SessionRules
  matchmaking: MatchmakingStrategyId
  /** The joining fee players are invoiced when the session ends; `null` for no fee (and while fees are switched off). */
  fee: FeeScheme | null
}

export interface CourtSetup {
  /** Client-generated UUID for new courts; existing id otherwise. */
  id: string
  label: string
}

export interface MemberSetup {
  /** Client-generated UUID for new players; existing id otherwise. */
  id: string
  name: string
  tierId: string
  /** Already at the venue: checked in from the start. Left out or false: they check in later (QR or the Queue Master). */
  checkedIn?: boolean
}

/** Body of create and update session requests. */
export interface SessionSetupInput extends SessionSettings {
  courts: CourtSetup[]
  members: MemberSetup[]
}

export interface PlayerRef {
  id: string
  name: string
}

export interface PlayerView extends PlayerRef {
  tierId: string
  gamesPlayed: number
  /** On court right now, so it can't be removed. */
  onCourt: boolean
  /** At the venue. Only checked-in players are matched or placed on courts. */
  checkedIn: boolean
  /** When they started waiting for their next game (checked in, or came off court), ISO; `null` while on court or not checked in. */
  waitingSince: string | null
  /** Since when they've been on a break, ISO; `null` while they're not on one. Players on a break sit out the queue. */
  breakSince: string | null
}

/** How check-in is going, for the QR dialog. */
export interface CheckInStatus {
  /** Link behind the check-in QR; `null` until the Queue Master first opens it. */
  url: string | null
  checkedIn: number
  /** Everyone on the roster (active players). */
  total: number
}

export interface CourtView {
  id: string
  label: string
  status: CourtStatus
  sides: [PlayerRef[], PlayerRef[]]
  /** ISO time the current match started. */
  startedAt: string | null
  /** ISO time the match reaches the session's time limit; `null` when there's no limit or no match. */
  endsAt: string | null
  matchId: string | null
  /** Players placed by hand on an open court, waiting for its match to start. */
  lineup: [PlayerRef[], PlayerRef[]]
  /** Empty places left in the lineup. */
  openSlots: number
  /** Whether "start match" would succeed right now. */
  canStart: boolean
  /** Why this court can't be removed now (a match on it, the last court…), or `null` when it can. */
  removeBlockedReason: string | null
  /** Why it can't start, in the user's words. */
  startBlockedReason: string | null
  /** Switched to tournament play: it plays bracket matches only. */
  tournament: boolean
  /** On a tournament court: the match on it, or the one it starts next. */
  tournamentMatch: { label: string; sides: [string, string] } | null
}

/** One group the matchmaking will call next, already split into sides. */
export interface NextMatchView {
  sides: [PlayerView[], PlayerView[]]
}

/** Who plays next with automatic queueing: the queue as groups, then whoever is left. */
export interface UpNextView {
  matches: NextMatchView[]
  /** Checked-in players not in a full group yet, in call order. */
  waiting: PlayerView[]
}

/** Body of placing a player on a court side. */
export interface AssignPlayerInput {
  playerId: string
  side: CourtSide
}

/** The session as the board renders it. All ordering is done by the server. */
export interface SessionView extends SessionSettings {
  id: string
  /** Set when planned in a club; `null` for sessions started straight from the board. */
  title: string | null
  /** The club that runs it (planned in a club); `null` otherwise. Its colours apply to the session's pages. */
  clubId: string | null
  /** Optimistic-concurrency version; sent back on every change. */
  version: number
  courts: CourtView[]
  /** Waiting, checked-in players in the order they'll be called. */
  queue: PlayerView[]
  /** The queue grouped into the matches it will make; `null` while queueing is manual. */
  upNext: UpNextView | null
  /** Roster players who haven't checked in yet, by name. They can't be matched. */
  awaitingCheckIn: PlayerView[]
  /** Checked-in players taking a break, longest first. They sit out until they're back. */
  onBreak: PlayerView[]
  /** Players in the running tournament (held out of open play), by name; empty without one. */
  tournamentCompetitors: PlayerView[]
  /** While a tournament runs: why competitors can't be changed from the board (it has started, hand-picked teams), or `null` when they can. */
  competitorsBlockedReason: string | null
  checkIn: CheckInStatus
  /** Everyone in the session, by name. */
  players: PlayerView[]
  /** Players needed to start the next match. */
  playersPerMatch: number
  playersPerSide: number
  /** The API's clock when this view was built, so timers stay right on devices with a wrong clock. */
  serverTime: string
  canStartMatch: boolean
  canAddCourt: boolean
  /** Whether the session can be finished now: not while a match is on court. */
  canEnd: boolean
  /** Why it can't be finished yet, in the user's words. */
  endBlockedReason: string | null
  /** Why another court can't be added, in the user's words. */
  addCourtBlockedReason: string | null
  /** Public read-only leaderboard link, or `null` when not published. */
  publicUrl: string | null
  /** The session's tournament, or `null` when none (or tournaments are switched off). */
  tournament: TournamentView | null
}

export interface GameScore {
  a: number
  b: number
}

/** Body of a finish-match request. An empty `games` list records no result. */
export interface FinishMatchInput {
  games: GameScore[]
}

export interface AddPlayerInput {
  name: string
  tierId: string
  /** Already checked in (the default for someone added at the venue); false lists them to check in later. */
  checkedIn?: boolean
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  name: string
  tierId: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  /** Consecutive wins up to now (matches without a score don't break it). */
  streak: number
  /** Places gained (+) or lost (−) in the most recent finished match. */
  movement: number
  badges: LeaderboardBadgeId[]
  /** Ids of the session's club badges this player has earned (see `clubBadges` on the view). */
  clubBadges: string[]
}

/** The story at the top of the leaderboard, worked out by the API. */
export interface LeaderboardSpotlight {
  leader: { playerId: string; name: string; wins: number } | null
  /** The nearest player behind the leader. */
  chaser: { playerId: string; name: string; winsBehind: number } | null
  matchesFinished: number
}

export interface MatchResult {
  id: string
  courtLabel: string
  finishedAt: string
  sides: [PlayerRef[], PlayerRef[]]
  games: GameScore[]
  /** `null` when finished without a score. */
  winner: MatchSide | null
}

export interface LeaderboardView {
  sessionId: string
  spotlight: LeaderboardSpotlight
  entries: LeaderboardEntry[]
  recentMatches: MatchResult[]
  /** Badges of the club that runs the session; empty for sessions without a club or while club badges are off. */
  clubBadges: ClubBadgeView[]
  /** The viewer's own entry (matched by their username or club roster name), the only one they can make share images of; `null` when they aren't on it. */
  viewerPlayerId: string | null
  /** The club that runs the session, for its share images; `null` for sessions without one. */
  club: LeaderboardClub | null
}

/** The club on a leaderboard and its images: its name and photo (`/api/media/...`). */
export interface LeaderboardClub {
  name: string
  avatarUrl: string | null
}

/** The Queue Master's most recently finished session, shown with its leaderboard until the next one starts. */
export interface EndedSessionView {
  id: string
  /** Set when the session was planned in a club; `null` otherwise. */
  title: string | null
  /** The club that ran it; `null` otherwise. */
  clubId: string | null
  /** The session's cover photo (`/api/media/...`); `null` without one or while clubs are off. */
  coverUrl: string | null
  sportId: SportId
  startedAt: string
  endedAt: string
  /** Matches finished with or without a score. */
  matchesFinished: number
  players: number
  /** It charged a joining fee, so it has invoices (`GET /api/invoices/:sessionId`). Always false while fees are off. */
  hasFee: boolean
}

/** What anyone with a published link sees. */
export interface PublicLeaderboardView {
  sportId: SportId
  status: 'active' | 'ended'
  updatedAt: string
  spotlight: LeaderboardSpotlight
  entries: LeaderboardEntry[]
  recentMatches: MatchResult[]
  clubBadges: ClubBadgeView[]
  /** The signed-in viewer's own entry, if they played; `null` signed out or not on it. */
  viewerPlayerId: string | null
  /** The club that runs the session, for its share images. */
  club: LeaderboardClub | null
}

export interface PublishResponse {
  publicUrl: string | null
}

export interface CheckInLinkResponse {
  checkInUrl: string
}

/** What a player sees after scanning the check-in QR. */
export interface CheckInRosterView {
  sportId: SportId
  status: 'active' | 'ended'
  players: { id: string; name: string; checkedIn: boolean }[]
}

/** Body of a self check-in from the QR page. */
export interface CheckInInput {
  playerId: string
}

export interface CheckInResponse {
  name: string
}
