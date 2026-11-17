import type { AccountRole, ProfileField } from '../types/account.ts'
import type { SetupStepId } from '../types/session.ts'
import type { SportId } from '../types/sport.ts'
import type { EndedSessionView } from './Session.ts'

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'conflict'
  | 'unavailable'
  | 'server_error'

/** Every non-2xx API response has this body. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Validation messages, keyed by setup step or form field. */
    fields?: Partial<Record<SetupStepId | string, string>>
    /** Matches the API log line for this request; shown to users as a reference. */
    requestId?: string
  }
}

export interface CurrentUser {
  id: string
  email: string | null
  /** The name to greet them by, once their profile has one. */
  displayName: string | null
  /** Their unique username, without the "@", once set. */
  username: string | null
  /** Their profile photo (`/api/media/...`), or `null`. */
  avatarUrl: string | null
  /** False until the required profile fields are filled in. */
  profileComplete: boolean
  missing: ProfileField[]
  /** How they use Matchpoynt; `null` for guests and unfinished profiles. */
  role: AccountRole | null
  /** Whether they can create and manage clubs (decided by the API: player-only accounts can't). */
  canManageClubs: boolean
  /** Whether they can run the session board, its history and invoices (decided by the API: player-only accounts can't). */
  canRunSessions: boolean
}

export interface MeResponse {
  user: CurrentUser | null
}

/** A password sign-in, and where to go next, as decided by the API. */
export interface SignInResponse extends MeResponse {
  redirectTo: string
}

/** One running session, for the session switcher. */
export interface ActiveSessionSummary {
  id: string
  /** The title, or "<Sport> session" for sessions started straight from the board. */
  label: string
  sportId: SportId
  startedAt: string
  courts: number
  /** Courts with a match on right now. */
  playing: number
  players: number
}

/** Every running session, newest first. */
export interface ActiveSessionsResponse {
  sessions: ActiveSessionSummary[]
}

export interface LatestEndedSessionResponse {
  session: EndedSessionView | null
}

/** A page of finished sessions, newest first (`GET /api/sessions/ended`). */
export interface EndedSessionsResponse {
  sessions: EndedSessionView[]
  /** Pass as `before` for the next page; `null` when there are no more. */
  nextBefore: string | null
}

/** One finished session, opened by its link (`/app/<session id>`). */
export interface EndedSessionResponse {
  session: EndedSessionView
}
