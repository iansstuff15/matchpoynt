import type { LeaderboardBadgeId, LeaderboardEntry, LeaderboardSpotlight, MatchResult, PlayerRef } from '@matchpoynt/shared'
import { leaderboardRules } from '@/config/leaderboard'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'

/** A player's results so far: what ranks and badges are decided from. */
export type Totals = Omit<LeaderboardEntry, 'rank' | 'movement' | 'badges' | 'clubBadges'>

const byFinish = (a: MatchState, b: MatchState) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0)
const diff = (t: Pick<Totals, 'pointsFor' | 'pointsAgainst'>) => t.pointsFor - t.pointsAgainst

/** Totals per player, in match order so streaks are right. Club badges count with it too (utils/club/badges.ts). */
export function tally(players: PlayerState[], finished: MatchState[]): Map<string, Totals> {
  const totals = new Map<string, Totals>()
  for (const p of players) {
    totals.set(p.id, { playerId: p.id, name: p.name, tierId: p.tierId, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0 })
  }
  for (const match of [...finished].sort(byFinish)) {
    const scored = { a: 0, b: 0 }
    for (const g of match.games) {
      scored.a += g.a
      scored.b += g.b
    }
    match.sides.forEach((side, i) => {
      const own = i === 0 ? 'a' : 'b'
      const other = own === 'a' ? 'b' : 'a'
      for (const id of side) {
        const t = totals.get(id)
        if (!t) continue
        t.played += 1
        t.pointsFor += scored[own]
        t.pointsAgainst += scored[other]
        if (match.winner === own) {
          t.wins += 1
          t.streak += 1
        } else if (match.winner === other) {
          t.losses += 1
          t.streak = 0
        }
      }
    })
  }
  return totals
}

/**
 * Orders players by wins, then point difference, then points scored. Players
 * who haven't played come last; removed players stay only if they played.
 * Equal records share a rank.
 */
function rank(players: PlayerState[], totals: Map<string, Totals>): (Totals & { rank: number })[] {
  const active = new Set(players.filter((p) => p.active).map((p) => p.id))
  const sorted = [...totals.values()]
    .filter((t) => t.played > 0 || active.has(t.playerId))
    .sort(
      (x, y) =>
        Number(y.played > 0) - Number(x.played > 0) ||
        y.wins - x.wins ||
        diff(y) - diff(x) ||
        y.pointsFor - x.pointsFor ||
        x.name.localeCompare(y.name),
    )
  const same = (a: Totals, b: Totals) => a.played > 0 === b.played > 0 && a.wins === b.wins && diff(a) === diff(b) && a.pointsFor === b.pointsFor
  let current = 0
  return sorted.map((t, i) => {
    if (i === 0 || !same(sorted[i - 1]!, t)) current = i + 1
    return { ...t, rank: current }
  })
}

function badgesFor(entries: (Totals & { rank: number })[]): Map<string, LeaderboardBadgeId[]> {
  const badges = new Map(entries.map((e) => [e.playerId, [] as LeaderboardBadgeId[]]))
  const award = (id: LeaderboardBadgeId, pick: (e: Totals) => number) => {
    const best = Math.max(...entries.map(pick))
    if (best <= 0) return
    for (const e of entries) if (pick(e) === best) badges.get(e.playerId)!.push(id)
  }
  award('most-wins', (e) => e.wins)
  award('best-diff', (e) => diff(e))
  award('most-played', (e) => e.played)
  for (const e of entries) {
    if (e.streak >= leaderboardRules.hotStreak) badges.get(e.playerId)!.push('hot-streak')
    if (e.losses === 0 && e.wins >= leaderboardRules.unbeatenMinPlayed) badges.get(e.playerId)!.push('unbeaten')
  }
  return badges
}

/** The full leaderboard: ranks, streaks, badges, and how far each player moved in the latest match. */
export function computeLeaderboard(players: PlayerState[], finished: MatchState[]): LeaderboardEntry[] {
  const now = rank(players, tally(players, finished))
  const latest = [...finished].sort(byFinish).at(-1)
  const before = latest ? new Map(rank(players, tally(players, finished.filter((m) => m !== latest))).map((e) => [e.playerId, e.rank])) : null
  const badges = badgesFor(now)
  return now.map((e) => ({
    ...e,
    movement: before?.has(e.playerId) ? before.get(e.playerId)! - e.rank : 0,
    badges: badges.get(e.playerId) ?? [],
    clubBadges: [],
  }))
}

/** Who leads, and who is closest behind them. */
export function computeSpotlight(entries: LeaderboardEntry[], finished: MatchState[]): LeaderboardSpotlight {
  const leader = entries[0] && entries[0].wins > 0 ? entries[0] : null
  const chaser = leader ? entries.find((e) => e.playerId !== leader.playerId && e.played > 0) : undefined
  return {
    leader: leader ? { playerId: leader.playerId, name: leader.name, wins: leader.wins } : null,
    chaser: leader && chaser ? { playerId: chaser.playerId, name: chaser.name, winsBehind: leader.wins - chaser.wins } : null,
    matchesFinished: finished.length,
  }
}

export function toMatchResult(match: MatchState, names: Map<string, string>): MatchResult {
  const ref = (id: string): PlayerRef => ({ id, name: names.get(id) ?? 'Removed player' })
  return {
    id: match.id,
    courtLabel: match.courtLabel,
    finishedAt: new Date(match.finishedAt ?? match.startedAt).toISOString(),
    sides: [match.sides[0].map(ref), match.sides[1].map(ref)],
    games: match.games,
    winner: match.winner,
  }
}
