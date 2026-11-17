import type { MatchState, SessionState } from '@/interfaces/SessionState'
import { playerViewConfig } from '@/config/playerView'
import { openMatchFor } from '@/utils/session/engine'

// When a waiting player's next match should start. Pure: it takes the
// session, its finished matches and the time, and simulates the open-play
// courts freeing up one match at a time.

/**
 * How long a match takes in this session: the median of its latest finished
 * matches, else its time limit, else `playerViewConfig.defaultMatchMinutes`.
 */
export function typicalMatchMs(state: SessionState, finished: MatchState[]): number {
  const lengths = finished
    .filter((m) => m.finishedAt !== null && m.finishedAt > m.startedAt)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
    .slice(0, playerViewConfig.recentMatches)
    .map((m) => m.finishedAt! - m.startedAt)
    .sort((a, b) => a - b)
  if (lengths.length) {
    const mid = Math.floor(lengths.length / 2)
    return lengths.length % 2 ? lengths[mid]! : Math.round((lengths[mid - 1]! + lengths[mid]!) / 2)
  }
  const limit = state.settings.rules.timeLimitMinutes
  return (limit ?? playerViewConfig.defaultMatchMinutes) * 60_000
}

/**
 * When the match at `index` in the queue's upcoming matches (0 is the next
 * one to start) should start. Each open-play court is free now if it's open,
 * or once its match has run the typical length; matches take the earliest
 * free court in turn. `null` without an open-play court.
 */
export function estimatedStart(state: SessionState, finished: MatchState[], index: number, now: number): number | null {
  const typical = typicalMatchMs(state, finished)
  const freeAt = state.courts
    .filter((c) => !c.tournament)
    .map((c) => {
      const match = openMatchFor(state, c.id)
      return match ? Math.max(now, match.startedAt + typical) : now
    })
  if (!freeAt.length) return null
  let start = now
  for (let i = 0; i <= index; i++) {
    freeAt.sort((a, b) => a - b)
    start = freeAt.shift()!
    freeAt.push(start + typical)
  }
  return start
}
