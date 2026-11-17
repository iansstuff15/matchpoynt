import type { AccountRole, ProfileField } from '../types/account.ts'
import type { LeaderboardBadgeId, MatchSide } from '../types/session.ts'
import type { SportId } from '../types/sport.ts'
import type { ClubBadgeView, PhotoPosition } from './Club.ts'
import type { GameScore, LeaderboardClub, LeaderboardEntry } from './Session.ts'
import type { SocialLink } from './Social.ts'

export interface PlayerSport {
  sportId: SportId
  tierId: string
}

/** Body of profile saves, and the profile part of sign-up. */
export interface ProfileInput {
  firstName: string
  lastName: string
  /** Kept for older clients; the display name is the username. */
  displayName?: string
  /** Unique, without the "@". */
  username: string
  phone: string | null
  city: string | null
  role: AccountRole
  acceptTerms: boolean
  sports: PlayerSport[]
}

export interface ProfileView {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  username: string | null
  phone: string | null
  city: string | null
  role: AccountRole | null
  termsAcceptedAt: string | null
  sports: PlayerSport[]
}

/** Where the signed-in person's profile stands. `missing` drives the complete-profile form. */
export interface ProfileStatus {
  complete: boolean
  missing: ProfileField[]
  profile: ProfileView
  /** Prefill from the sign-in provider (e.g. the name on a Google account). */
  suggested: Partial<Pick<ProfileInput, 'firstName' | 'lastName' | 'displayName' | 'username'>>
}

export interface SignUpInput {
  email: string
  password: string
  profile: ProfileInput
  /** Page the confirmation link returns to (checked by the API, like sign-in's). */
  next?: string
}

export interface SignUpResponse {
  /** True when a confirmation email was sent: the account signs in once its email is confirmed. */
  confirmEmail: boolean
}

export interface PasswordSignInInput {
  email: string
  password: string
  /** Page to return to afterwards (e.g. where the sign-in expired). The API decides if it's allowed. */
  next?: string
}

export interface ForgotPasswordInput {
  /** The account's email, or its username. */
  email: string
}

export interface ResetPasswordInput {
  password: string
}

/** Who an email belongs to, for the sign-in form's password step (`POST /api/auth/lookup`). `null` fields when unknown or not set. */
export interface AccountLookupResponse {
  account: { username: string | null; displayName: string | null; avatarUrl: string | null; avatarPosition: PhotoPosition } | null
}

/** A club the person plays in (linked by accepting an invite), with the name they have on its roster. */
export interface ProfileClubView {
  id: string
  name: string
  handle: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  memberName: string
}

/** A badge the person has earned, and how many times (session badges can be earned again). */
export interface ProfileClubBadge {
  clubId: string
  clubName: string
  badge: ClubBadgeView
  times: number
}

/** Their record across their clubs' sessions. */
export interface ProfileStats {
  sessions: number
  played: number
  wins: number
  losses: number
  /** Percent of matches with a result; `null` before any. */
  winRate: number | null
}

/** Their record in one sport. */
export interface ProfileSportRecord {
  sportId: SportId
  stats: ProfileStats
}

/** Their record in one club, and the sports they've played there. */
export interface ProfileClubRecord {
  clubId: string
  clubName: string
  sportIds: SportId[]
  stats: ProfileStats
}

/** One session they played in: their record in it and what they earned there. */
export interface ProfileSessionRecord {
  sessionId: string
  sessionLabel: string
  clubId: string
  clubName: string
  sportId: SportId
  endedAt: string
  played: number
  wins: number
  losses: number
  /** Their place on the session's final leaderboard. */
  rank: number | null
  /** How many were ranked. */
  ranked: number
  /** The club's session badges earned there. */
  clubBadges: ClubBadgeView[]
  leaderboardBadges: LeaderboardBadgeId[]
  /** Their row on the session's final leaderboard, for sharing images of it; `null` when they weren't ranked. */
  entry: LeaderboardEntry | null
  /** The club, drawn on shared images. */
  club: LeaderboardClub
}

/** Where a badge was earned: a session (session badges) or the club as a whole (career badges). */
export interface ProfileBadgeEarned {
  sessionId: string
  sessionLabel: string
  endedAt: string
}

/** One badge in their collection: how often, in which sports, and where it was earned. */
export interface ProfileCollectedClubBadge extends ProfileClubBadge {
  sportIds: SportId[]
  /** Sessions it was earned in, newest first; empty for a career badge. */
  earnedIn: ProfileBadgeEarned[]
  /** When it was last earned: the newest session it came from (or, for a career badge, the club's latest session they played). */
  lastEarnedAt: string | null
}

export interface ProfileCollectedLeaderboardBadge {
  id: LeaderboardBadgeId
  times: number
  sportIds: SportId[]
  earnedIn: (ProfileBadgeEarned & { clubName: string })[]
  lastEarnedAt: string | null
}

/**
 * Their record across every club, sport and session (`GET /api/profile/record`):
 * totals, broken down by sport and by club, each session they played in, and
 * their badge collection with where each badge came from.
 */
export interface ProfileRecordView {
  stats: ProfileStats
  bySport: ProfileSportRecord[]
  byClub: ProfileClubRecord[]
  /** Newest first. */
  sessions: ProfileSessionRecord[]
  collection: {
    clubBadges: ProfileCollectedClubBadge[]
    leaderboardBadges: ProfileCollectedLeaderboardBadge[]
  }
  /** Who they've played against most, and with: their record against each opponent and with each partner. */
  rivals: { opponents: RivalView[]; partners: RivalView[] }
}

/** Someone they've played against (or with) and how it went: matches, and their wins and losses in them. */
export interface RivalView {
  /** As they appear on the latest roster they shared. */
  name: string
  played: number
  wins: number
  losses: number
  /** When they last played (against or with) them, ISO. */
  lastPlayedAt: string
}

/** The signed-in person's profile page (`GET /api/profile/page`). */
export interface ProfilePageView {
  profile: ProfileView
  email: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  socialLinks: SocialLink[]
  /** When the account's profile was made. */
  memberSince: string | null
  clubs: ProfileClubView[]
  stats: ProfileStats
  clubBadges: ProfileClubBadge[]
  /** Leaderboard badges earned in sessions (most wins, hot streak…), with how many times. */
  leaderboardBadges: { id: LeaderboardBadgeId; times: number }[]
}

/** One match the person played. Sides are from their point of view: `games[].a` is their side's score. */
export interface ProfileGameView {
  matchId: string
  sessionId: string
  sessionLabel: string
  clubId: string
  clubName: string
  sportId: SportId
  finishedAt: string
  partners: string[]
  opponents: string[]
  games: GameScore[]
  /** Their side's result; `null` when the match had no score. */
  result: 'win' | 'loss' | null
  winner: MatchSide | null
}

/** A page of the person's games, newest first (`GET /api/profile/games?before=`). */
export interface ProfileGamesResponse {
  games: ProfileGameView[]
  /** Pass as `before` for the next page; `null` at the end. */
  nextBefore: string | null
}
