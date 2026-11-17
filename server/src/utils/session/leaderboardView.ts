import type { ClubBadgeView, LeaderboardClub, LeaderboardView } from '@matchpoynt/shared'
import { limits } from '@/config/limits'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'
import { awardClubBadges, careerKey, type BadgeTotals } from '@/utils/club/badges'
import { computeLeaderboard, computeSpotlight, toMatchResult } from '@/utils/session/leaderboard'

/** The viewer's own player in a session, by their name (username or club roster name, matched like career badges); `null` when none. */
export function viewerPlayerId(players: Pick<PlayerState, 'id' | 'name' | 'active'>[], viewerName: string | null): string | null {
  if (!viewerName) return null
  const key = careerKey(viewerName)
  return players.find((p) => p.active && careerKey(p.name) === key)?.id ?? players.find((p) => careerKey(p.name) === key)?.id ?? null
}

/**
 * A session's leaderboard: ranks, badges (the club's too, when given), the
 * spotlight and recent results, and which entry is the viewer's
 * (`viewerName`). `finished` is newest first. The board's
 * Leaderboard tab and the players' live view both answer with it.
 */
export function leaderboardView(
  sessionId: string,
  players: PlayerState[],
  finished: MatchState[],
  clubBadges: ClubBadgeView[] = [],
  career: Map<string, BadgeTotals> = new Map(),
  viewerName: string | null = null,
  club: LeaderboardClub | null = null,
): LeaderboardView {
  const names = new Map(players.map((p) => [p.id, p.name]))
  const entries = awardClubBadges(computeLeaderboard(players, finished), clubBadges, career)
  return {
    sessionId,
    spotlight: computeSpotlight(entries, finished),
    entries,
    recentMatches: finished.slice(0, limits.recentMatches).map((m) => toMatchResult(m, names)),
    clubBadges,
    viewerPlayerId: viewerPlayerId(players, viewerName),
    club,
  }
}
