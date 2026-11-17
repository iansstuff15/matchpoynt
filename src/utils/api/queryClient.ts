import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { handleExpiredSignIn } from '@/utils/api/authExpiry'
import { ApiRequestError } from '@/utils/api/errors'
import { forgetOnAccountChange, saveCacheOnLeave } from '@/utils/api/persistCache'

export const queryKeys = {
  config: ['config'] as const,
  me: ['me'] as const,
  activeSessions: ['sessions', 'active'] as const,
  session: (sessionId: string) => ['sessions', sessionId, 'board'] as const,
  latestEndedSession: ['sessions', 'latest-ended'] as const,
  endedSessions: ['sessions', 'ended-list'] as const,
  endedSession: (sessionId: string) => ['sessions', sessionId, 'ended'] as const,
  sessionInvoices: (sessionId: string) => ['sessions', sessionId, 'invoices'] as const,
  nameCheck: (kind: 'handle' | 'username', value: string, club: string) => ['name-check', kind, value, club] as const,
  profilePage: ['profile', 'page'] as const,
  clubPages: ['clubs', 'pages'] as const,
  peopleSearch: (q: string, clubId: string) => ['people', clubId, q] as const,
  directory: (q: string) => ['directory', 'list', q] as const,
  /** The clubs the viewer is a member of, for the club picker. */
  myClubs: ['directory', 'mine'] as const,
  myInvites: ['directory', 'invites'] as const,
  playerClub: (handle: string) => ['directory', 'club', handle] as const,
  joinCard: (handle: string) => ['public', 'club', handle] as const,
  clubSessions: (clubId: string) => ['clubs', clubId, 'sessions-page'] as const,
  profileGames: ['profile', 'games'] as const,
  /** One filter's games: `profileGames` with the sport, club or session. */
  profileGamesOf: (filter: Record<string, string>) => ['profile', 'games', filter] as const,
  profileRecord: ['profile', 'record'] as const,
  accountLookup: (email: string) => ['account-lookup', email] as const,
  /** Everything accounting for one club; changes invalidate it all. */
  accounting: (clubId: string) => ['accounting', clubId] as const,
  billers: (clubId: string) => ['accounting', clubId, 'billers'] as const,
  expenses: (clubId: string, filter: Record<string, string>) => ['accounting', clubId, 'expenses', filter] as const,
  accountingSummary: (clubId: string, range: Record<string, string>) => ['accounting', clubId, 'summary', range] as const,
  clubInvoices: (clubId: string, range: Record<string, string>) => ['accounting', clubId, 'invoices', range] as const,
  /** One manual invoice, or one expense, on its own page. */
  manualInvoice: (clubId: string, id: string) => ['accounting', clubId, 'invoice', id] as const,
  expense: (clubId: string, id: string) => ['accounting', clubId, 'expense', id] as const,
  clubs: ['clubs'] as const,
  invite: (token: string) => ['invites', token] as const,
  memberSuggestions: (q: string, sportId: string, sessionId: string, exclude: string[]) => ['members', 'suggestions', sportId, sessionId, q, exclude] as const,
  club: (clubId: string) => ['clubs', clubId] as const,
  leaderboard: (sessionId: string) => ['sessions', sessionId, 'leaderboard'] as const,
  publicLeaderboard: (slug: string) => ['public', slug, 'leaderboard'] as const,
  publicTournament: (slug: string) => ['public', slug, 'tournament'] as const,
  checkInRoster: (slug: string) => ['public', slug, 'check-in'] as const,
  /** A club's feedback form and results (owner). Never kept on the device. */
  clubFeedback: (clubId: string) => ['feedback', 'club', clubId] as const,
  clubAnnouncements: (clubId: string) => ['announcements', 'club', clubId] as const,
  memberAnnouncements: (handle: string) => ['announcements', 'member', handle] as const,
  planAttendees: (handle: string, planId: string) => ['plan-attendees', handle, planId] as const,
  upcomingSessions: ['play', 'upcoming'] as const,
  /** What a member is asked for feedback at a club. */
  memberFeedback: (handle: string) => ['feedback', 'member', handle] as const,
  friends: ['friends'] as const,
  friendSearch: (q: string) => ['friends', 'search', q] as const,
  person: (username: string) => ['person', username] as const,
  /** Running club sessions the signed-in player is in, and one of them live. */
  playSessions: ['play'] as const,
  playSession: (sessionId: string) => ['play', sessionId] as const,
  playLeaderboard: (sessionId: string) => ['play', sessionId, 'leaderboard'] as const,
}

export const queryClient: QueryClient = new QueryClient({
  // Any 401 outside /api/auth means the sign-in expired (utils/api/authExpiry).
  queryCache: new QueryCache({ onError: (error) => handleExpiredSignIn(queryClient, error, queryKeys.me) }),
  mutationCache: new MutationCache({ onError: (error) => handleExpiredSignIn(queryClient, error, queryKeys.me) }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // Don't retry answers the server meant (401, 404, 409, ...).
      retry: (count, error) => !(error instanceof ApiRequestError && error.status > 0) && count < 2,
    },
  },
})

// Kept club details never outlive the account they belong to (utils/api/persistCache.ts).
forgetOnAccountChange(queryClient)
saveCacheOnLeave(queryClient)
