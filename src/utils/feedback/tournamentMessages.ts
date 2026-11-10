import type { TournamentFormat, TournamentMatchView } from '@matchpoynt/shared'
import { tournamentFormats } from '@/config/tournament'

// Wording for tournament toasts. Errors never come here: they go to an error banner.

export const tournamentFormatLabel = (format: TournamentFormat) => tournamentFormats.find((f) => f.id === format)?.label ?? format

/** "Ana & Ben beat Cy & Dee" for a finished match. */
export function resultLine(m: TournamentMatchView): string {
  if (m.winner === null) return m.label
  const winner = m.sides[m.winner]
  const loser = m.sides[m.winner === 0 ? 1 : 0]
  return `${winner.label} beat ${loser.label}`
}
