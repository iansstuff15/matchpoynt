import type { TournamentMatchView } from '@matchpoynt/shared'
import { Check, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const statusLabel: Partial<Record<TournamentMatchView['status'], string>> = {
  ready: 'Ready',
  walkover: 'Walkover',
  void: 'Not played',
}

/** One tournament match: both sides (or what they wait for), the winner, and each game's score. */
export default function BracketMatchCard({ match }: { match: TournamentMatchView }) {
  return (
    <article className="bracket-match" data-status={match.status} aria-label={match.label}>
      <header className="bracket-match-head">
        <span className="truncate" title={match.label}>
          {match.label}
        </span>
        {match.status === 'playing' ? (
          <Badge className="h-5 gap-1 px-1.5 text-[10px]">
            <Radio aria-hidden />
            {match.courtLabel ?? 'On court'}
          </Badge>
        ) : (
          statusLabel[match.status] && <span className="shrink-0">{statusLabel[match.status]}</span>
        )}
      </header>
      {match.sides.map((side, i) => {
        const won = match.winner === i
        const lost = match.winner !== null && !won
        return (
          <div
            key={i}
            className="bracket-side"
            data-winner={won || undefined}
            data-loser={lost || undefined}
            data-placeholder={side.placeholder !== null || undefined}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {won && <Check className="size-3.5 shrink-0" aria-label="Winner" />}
              <span className="truncate" title={side.players.map((p) => p.name).join(', ') || side.label}>
                {side.label}
              </span>
            </span>
            {match.games.length > 0 && (
              <span className="bracket-score" aria-label={`${side.label} scores`}>
                {match.games.map((g, n) => (
                  <span key={n}>{i === 0 ? g.a : g.b}</span>
                ))}
              </span>
            )}
          </div>
        )
      })}
    </article>
  )
}
