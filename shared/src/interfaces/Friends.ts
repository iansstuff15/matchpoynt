import type { AccountRole, FriendStatus } from '../types/account.ts'
import type { SportId } from '../types/sport.ts'
import type { PhotoPosition } from './Club.ts'
import type { SocialLink } from './Social.ts'

/** Someone on Matchpoynt as a friends list shows them. */
export interface FriendPerson {
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  avatarPosition: PhotoPosition
}

/** A friend, or a request either way. `id` is the friendship's, for accepting, declining or removing it. */
export interface FriendView {
  id: string
  person: FriendPerson
  /** When they became friends, or when the request was sent. */
  since: string
}

/** The Friends page (`GET /api/friends`): friends by name, then requests to answer and requests sent. */
export interface FriendsView {
  friends: FriendView[]
  incoming: FriendView[]
  outgoing: FriendView[]
}

/** Body of a friend request (`POST /api/friends`). */
export interface FriendRequestInput {
  userId: string
}

/** Body of answering a request (`POST /api/friends/:id`). */
export interface FriendAnswerInput {
  accept: boolean
}

/** A person found by the friend search, with where they stand with the caller. */
export interface FriendSearchResult extends FriendPerson {
  status: FriendStatus
  /** The friendship to answer or remove, when there is one. */
  friendshipId: string | null
}

export interface FriendSearchResponse {
  people: FriendSearchResult[]
}

/** Someone's public profile (`GET /api/users/:username`): never their names, email or phone. */
export interface PersonProfileView {
  userId: string
  username: string
  avatarUrl: string | null
  avatarPosition: PhotoPosition
  city: string | null
  role: AccountRole | null
  /** When they joined Matchpoynt, ISO. */
  memberSince: string
  socialLinks: SocialLink[]
  sports: { sportId: SportId; tierId: string }[]
  /** The clubs (with handles) they're a member of, by name. */
  clubs: { id: string; name: string; handle: string; avatarUrl: string | null; avatarPosition: PhotoPosition }[]
  /** It's the viewer's own profile. */
  isMe: boolean
  /** Where the viewer stands with them, and the friendship to answer or remove; `null` for themselves or while friends are off. */
  friend: { status: FriendStatus; friendshipId: string | null } | null
}
