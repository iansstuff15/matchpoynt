import type { LeaderboardBadgeId, QueueingMode } from '../types/session.ts'
import type { CurrencyCode, PaymentStatus } from '../types/fee.ts'
import type { ClubBadgeView, PaymentQrView } from './Club.ts'
import type { InvoicePayment } from './Fee.ts'
import type { MatchResult } from './Session.ts'
import type { SportId } from '../types/sport.ts'

/** Where the viewing player stands in the session right now. */
export type PlayerLiveStatus = 'playing' | 'up_next' | 'queued' | 'placed' | 'on_break' | 'checking_in' | 'not_in_session'

/** A court as players see it: who's on and how long they've been playing. */
export interface PlayerLiveCourt {
  id: string
  label: string
  status: 'open' | 'playing'
  /** Names on each side: playing, or placed on an open court for its next match. */
  sides: [string[], string[]]
  startedAt: string | null
  /** When the match time limit runs out, while it's on. */
  endsAt: string | null
  /** The viewer is on this court (playing or placed). */
  mine: boolean
  /** Which side the viewer is on (0 or 1), or `null` when they aren't on this court. */
  mySide: 0 | 1 | null
}

/** A match the queue will start next (automatic queueing). */
export interface PlayerLiveUpNext {
  sides: [string[], string[]]
  /** The viewer is in it. */
  mine: boolean
}

/** Someone waiting in the queue, in call order. */
export interface PlayerLiveQueued {
  name: string
  /** When they joined the queue; timers add the gap to `serverTime`. */
  waitingSince: string | null
  gamesPlayed: number
  isMe: boolean
}

/** The viewer: their place, their wait and what's next for them, all worked out by the API. */
export interface PlayerLiveMe {
  name: string
  status: PlayerLiveStatus
  /** One line saying where they stand, e.g. "You're up next on the next free court." */
  headline: string
  /** Since when they've been waiting for their next game; `null` while playing or not checked in. */
  waitingSince: string | null
  /** 1-based place in the queue's call order; `null` when not in it. */
  queuePosition: number | null
  /** Matches that start before theirs (automatic queueing); `null` when unknown. */
  matchesAhead: number | null
  /** The court they're on, playing or placed. */
  courtLabel: string | null
  gamesPlayed: number
  wins: number
  losses: number
  /** Leaderboard badges they hold in this session so far (most wins, hot streak…), as the leaderboard awards them. */
  badges: LeaderboardBadgeId[]
  /** Wins in a row, for the hot streak tag. */
  streak: number
  /** Ids of the club's own badges they hold (from `clubBadges` on the view): session ones from this session, career ones from every club session. */
  clubBadges: string[]
  /** Their place on the session's leaderboard right now, of `ranked`; `null` before they've played. */
  rank: number | null
  ranked: number
  pointsFor: number
  pointsAgainst: number
  /** The match the queue will start for them next (automatic queueing), their side first; `null` when there's none yet. */
  nextMatch: { partners: string[]; opponents: string[] } | null
  /**
   * When their next match should start, estimated by the API from the matches
   * before theirs, the courts and how long this session's matches take; `null`
   * when it can't say (playing, manual queueing, no match for them yet).
   */
  estimatedStartAt: string | null
  /** What they'd owe for the session so far, while it charges a fee; `null` otherwise. */
  fee: { amount: number; text: string; breakdown: string } | null
  /** Whether they can check themselves in from the app (on the roster, not checked in yet). */
  canCheckIn: boolean
  /** Since when they've been on a break, ISO; `null` while they're not on one. */
  breakSince: string | null
  /** Why they can't start a break right now (e.g. on court), or `null` when they can; always `null` while on one (they can come back). */
  breakBlockedReason: string | null
}

/** A friend of the viewer who's on the session's roster, and where they are. */
export interface PlayerLiveFriend {
  name: string
  status: 'playing' | 'waiting' | 'checking_in'
}

/** The session's settings players care about, worded by the API. */
export interface PlayerLiveInfo {
  /** e.g. "Badminton · 21 points, doubles". */
  format: string
  /** e.g. "15 min per match", or `null` without a limit. */
  timeLimit: string | null
  courts: number
  /** e.g. "Fair queue: the app picks who plays next". */
  queueing: string
  /** The session's fee, e.g. "₱150 to play", or `null` without one. */
  fee: string | null
}

/** A player's live view of a running club session (`GET /api/play/:sessionId`). */
export interface PlayerLiveView {
  ended: false
  sessionId: string
  title: string
  sportId: SportId
  clubName: string
  clubHandle: string | null
  queueing: QueueingMode
  /** Server clock when this was built; timers correct the device clock with it. */
  serverTime: string
  /** `null` when the viewer isn't on the session's roster. */
  me: PlayerLiveMe | null
  courts: PlayerLiveCourt[]
  /** Who plays next and against whom (automatic queueing); `null` with manual queueing. */
  upNext: PlayerLiveUpNext[] | null
  /** Everyone waiting, in call order. */
  queue: PlayerLiveQueued[]
  /** Checked in and waiting, on court, and still to check in. */
  counts: { waiting: number; playing: number; checkingIn: number }
  /** The club's own badges the viewer holds, to draw beside the leaderboard's; empty while club badges are off. */
  clubBadges: ClubBadgeView[]
  /** Every finished match of the session, newest first. */
  history: MatchResult[]
  /** The viewer's friends who are on the roster tonight. */
  friendsHere: PlayerLiveFriend[]
  info: PlayerLiveInfo
  /** How long a match has been taking in this session, in minutes, as the wait estimate counts it. */
  typicalMatchMinutes: number
}

/** A running session of one of the viewer's clubs that they're on the roster of, for the "Your sessions" list. */
export interface PlayerLiveSummary {
  sessionId: string
  title: string
  sportId: SportId
  clubName: string
  startedAt: string
  /** Where the viewer stands in it right now (playing, up next, queued…), for the Playing now tab. */
  status: PlayerLiveStatus
}

export interface PlayerLiveListResponse {
  sessions: PlayerLiveSummary[]
}

/** A club session that has ended, for its players' "Session ended" screen, where they give the club feedback. */
export interface PlayerSessionEndedView {
  ended: true
  sessionId: string
  title: string
  sportId: SportId
  clubName: string
  clubHandle: string | null
  endedAt: string
  /** What the viewer owes for it and what they've paid; `null` without a fee, without an invoice for them, or while fees are off. */
  payment: PlayerPaymentView | null
  /** The club's QR codes to pay with; empty while fees are off. */
  paymentQrs: PaymentQrView[]
}

/** The viewer's invoice for a session: what they owe, paid and have left, and their payments. */
export interface PlayerPaymentView {
  currency: CurrencyCode
  amount: number
  paidAmount: number
  balance: number
  status: PaymentStatus
  /** How it was worked out, e.g. "₱100.00 + 4 games × ₱50.00". */
  breakdown: string
  payments: InvoicePayment[]
}

/** What `GET /api/play/:sessionId` answers: the live view while it runs, then its ended screen. */
export type PlayerSessionResponse = PlayerLiveView | PlayerSessionEndedView
