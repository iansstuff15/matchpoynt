import type { ClubStandingView } from '@matchpoynt/shared'
import { careerKey, careerTotals, type ClubHistory } from '@/utils/club/badges'

/**
 * The club's leaderboard: every player's record across the club's finished
 * sessions, matched by name (as career badges are), best first: most wins,
 * then the better win rate, then more matches, then by name. Players who
 * never finished a match are left out.
 */
export function clubStandings(history: ClubHistory, limit: number): ClubStandingView[] {
  const names = new Map<string, string>()
  for (const p of history.players) if (!names.has(careerKey(p.name))) names.set(careerKey(p.name), p.name.trim().replace(/\s+/g, ' '))
  const rows = [...careerTotals(history)]
    .filter(([, t]) => t.played > 0)
    .map(([key, t]) => {
      const decided = t.wins + t.losses
      return { name: names.get(key) ?? key, sessions: t.sessions, played: t.played, wins: t.wins, losses: t.losses, winRate: decided ? Math.round((t.wins / decided) * 100) : null }
    })
    .sort((a, b) => b.wins - a.wins || (b.winRate ?? -1) - (a.winRate ?? -1) || b.played - a.played || a.name.localeCompare(b.name))
  return rows.slice(0, limit).map((row, i) => ({ rank: i + 1, ...row }))
}
