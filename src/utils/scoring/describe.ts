import type { ScoringFormat } from '@matchpoynt/shared'
import type { Sport } from '@/interfaces/Sport'
import type { MatchFormat } from '@matchpoynt/shared'

/** "First to 21 points · win by 2 · ceiling 30 · best of 3" */
export function describeScoring(format: ScoringFormat, sport: Sport): string {
  const unit = `${sport.terminology.scoreUnit}s`
  const parts = [`First to ${format.pointsToWin} ${unit}`]
  if (format.winBy > 1) parts.push(`win by ${format.winBy}`)
  if (format.cap && format.cap > format.pointsToWin) parts.push(`ceiling ${format.cap}`)
  parts.push(format.bestOf > 1 ? `best of ${format.bestOf}` : 'one game')
  return parts.join(' · ')
}

const matchFormatLabels: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  team: 'Teams',
}

/** "Doubles (2 per side)" */
export function describeMatchFormat(format: MatchFormat, sport: Sport): string {
  const perSide = format === 'singles' ? 1 : format === 'doubles' ? 2 : sport.playersPerSide
  return `${matchFormatLabels[format]} (${perSide} per side)`
}
