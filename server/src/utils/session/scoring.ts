import type { GameScore, MatchSide, ScoringFormat } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

/** Whether one game's final score is reachable under the format's rules. */
export function isValidGame(format: ScoringFormat, { a, b }: GameScore): boolean {
  const high = Math.max(a, b)
  const low = Math.min(a, b)
  if (high === low || high < format.pointsToWin) return false
  if (format.cap !== undefined && high > format.cap) return false
  // Reached the target with enough lead.
  if (high === format.pointsToWin) return high - low >= format.winBy
  // Played past the target: deuce ends at exactly the required lead, or at the cap.
  return high - low === format.winBy || (format.cap !== undefined && high === format.cap)
}

function describeRule(format: ScoringFormat): string {
  const parts = [`first to ${format.pointsToWin}`]
  if (format.winBy > 1) parts.push(`win by ${format.winBy}`)
  if (format.cap !== undefined && format.cap > format.pointsToWin) parts.push(`ceiling ${format.cap}`)
  return parts.join(', ')
}

/**
 * Checks every game and decides the winner. An empty list means the match
 * ended without a result (e.g. out of time) and returns `null`.
 */
export function decideMatch(format: ScoringFormat, games: GameScore[]): MatchSide | null {
  if (games.length === 0) return null
  if (games.length > format.bestOf) {
    throw invalid(`This format is at most ${format.bestOf} game${format.bestOf > 1 ? 's' : ''}.`, { games: 'Too many games' })
  }

  const needed = Math.floor(format.bestOf / 2) + 1
  const wins = { a: 0, b: 0 }
  games.forEach((game, index) => {
    const label = `Game ${index + 1}`
    if (wins.a === needed || wins.b === needed) {
      throw invalid(`${label} was entered after the match was already decided.`, { [`game-${index}`]: 'Not needed' })
    }
    if (!isValidGame(format, game)) {
      throw invalid(`${label}: ${game.a}–${game.b} isn't a valid score (${describeRule(format)}).`, {
        [`game-${index}`]: 'Invalid score',
      })
    }
    wins[game.a > game.b ? 'a' : 'b'] += 1
  })

  if (wins.a < needed && wins.b < needed) {
    throw invalid(`Enter games until one side has won ${needed}.`, { games: 'Match not decided' })
  }
  return wins.a > wins.b ? 'a' : 'b'
}
