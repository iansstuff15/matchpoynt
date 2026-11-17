import type { ClubMemberRole, ClubMembership, JoinApproval, PlanSignUp } from '../types/club.ts'
import type { SportId } from '../types/sport.ts'
import type { ClubBadgeView, ClubTheme, MemberTier, PhotoPosition } from './Club.ts'
import type { FeeScheme } from './Fee.ts'
import type { SocialLink } from './Social.ts'

/** Someone on Matchpoynt, as the member search shows them. */
export interface PersonCard {
  userId: string
  username: string | null
  displayName: string | null
  email: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
}

/** Up to 5 people matching what was typed, by name, email or @username (`GET /api/people/search?q=`). */
export interface PeopleSearchResponse {
  people: PersonCard[]
}

/** A link a club shares with new members, e.g. a group chat. */
export interface WelcomeLink {
  label: string
  url: string
}

/** How people join a club, and what they're shown when they do. */
export interface ClubJoiningInput {
  /** `auto`: anyone who asks joins at once. `manual`: the owner approves each request. */
  approval: JoinApproval
  welcomeMessage: string | null
  welcomeLinks: WelcomeLink[]
}

/** Someone asking to join the club, for the owner to approve or decline. */
export interface JoinRequestView {
  id: string
  userId: string
  name: string
  username: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  /** Their skill tiers, as they were when they asked. */
  tiers: MemberTier[]
  requestedAt: string
}

/** A member asking to join one of the club's sessions (planned or running). */
export interface SessionRequestView {
  id: string
  memberId: string
  memberName: string
  planId: string | null
  sessionId: string | null
  /** The session's title (or "<Sport> session"). */
  sessionLabel: string
  requestedAt: string
}

/** A club in the directory, and where the viewer stands with it. */
/** The clubs the signed-in person is a member of, by name, for the club picker (`GET /api/directory/mine`). */
export interface MyClubsResponse {
  clubs: DirectoryClubView[]
}

export interface DirectoryClubView {
  id: string
  name: string
  handle: string | null
  description: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  coverUrl: string | null
  coverPosition: PhotoPosition
  members: number
  approval: JoinApproval
  membership: ClubMembership
  /** The club's colours (readable text worked out by the API), so its card wears them; `null` for Matchpoynt's own. */
  theme: ClubTheme | null
}

/** A page of the directory, newest clubs first (`GET /api/directory?q=&offset=`). */
export interface ClubDirectoryResponse {
  clubs: DirectoryClubView[]
  /** Pass as `offset` for the next page; `null` at the end. */
  nextOffset: number | null
}

/** One of the club's sessions as players see it: planned (coming up) or running now. */
export interface PlayerSessionView {
  /** The plan's id or the session's. */
  id: string
  kind: 'planned' | 'active'
  title: string
  sportId: SportId
  /** When it's planned for, or when it started; `null` for a plan with no date yet. */
  when: string | null
  players: number
  /** The viewer is on its roster (or playing in it). */
  joined: boolean
  /** The viewer has asked to join it and is waiting for the owner. */
  requested: boolean
  /** A plan's sign-up mode; `null` for a session running now. */
  signUp: PlanSignUp | null
  /** Places left on a plan with a player cap; `null` without one, or for a running session. */
  spotsLeft: number | null
  /** Why the viewer can't sign up for (or leave) this plan right now, from the API; `null` when they can. */
  signUpBlockedReason: string | null
}

/** Who's signed up for a planned session (`GET /api/directory/:handle/plans/:planId/attendees`), for its members. */
export interface PlanAttendeesView {
  /** Roster names, A to Z. */
  names: string[]
  spotsLeft: number | null
}

/** A planned session the viewer is signed up for that starts soon (`GET /api/play/upcoming`): the in-app reminder. */
export interface UpcomingSessionView {
  planId: string
  title: string
  sportId: SportId
  clubName: string
  clubHandle: string
  /** When it starts, ISO. */
  when: string
}

/** One player on the club's leaderboard: their record across every session the club has run. */
export interface ClubStandingView {
  rank: number
  name: string
  sessions: number
  played: number
  wins: number
  losses: number
  /** Percent of matches with a result; `null` before any. */
  winRate: number | null
}

/** A club's page for players (`/c/<handle>`, `GET /api/directory/:handle`). */
export interface PlayerClubPageView {
  club: DirectoryClubView & {
    socialLinks: SocialLink[]
    fee: FeeScheme | null
    feeSummary: string | null
    theme: ClubTheme | null
  }
  /** The viewer's member id, once they're a member. */
  memberId: string | null
  /** The viewer's role in the club, once they're a member. */
  myRole: ClubMemberRole | null
  /** Members with a role other than `member` (captains, coaches, Queue Masters, managers), by role then name. */
  team: ClubTeamMember[]
  /** What the club shares with members; `null` until the viewer is one. */
  welcome: { message: string | null; links: WelcomeLink[] } | null
  /** The viewer's open in-app invite to this club, if any. */
  inviteId: string | null
  sessions: PlayerSessionView[]
  /** Badges anyone can earn in the club's sessions. */
  badges: ClubBadgeView[]
  /** Best record first; the top `directoryLimits.leaderboard` players. */
  leaderboard: ClubStandingView[]
}

/** What asking to join did: `joined` (auto approval or an invite), or `requested` (waiting for the owner). */
export interface JoinClubResponse {
  status: 'joined' | 'requested'
  page: PlayerClubPageView
}

/** Body of a member asking to join a session: the plan's id or the running session's. */
export interface SessionJoinInput {
  planId: string | null
  sessionId: string | null
}

/** A club's join page, readable signed out (`GET /api/public/clubs/:handle`). */
export interface ClubJoinCardView {
  name: string
  handle: string
  description: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  coverUrl: string | null
  coverPosition: PhotoPosition
  members: number
  approval: JoinApproval
}

/** An invite a club owner sent in the app, waiting for the viewer. */
export interface MyClubInviteView {
  id: string
  club: DirectoryClubView
  sentAt: string
}

export interface MyClubInvitesResponse {
  invites: MyClubInviteView[]
}

/** Someone on a club's team, as its page for players lists them. */
export interface ClubTeamMember {
  name: string
  role: ClubMemberRole
  username: string | null
  avatarUrl: string | null
}
