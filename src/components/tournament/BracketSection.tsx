import type { TournamentSectionView } from '@matchpoynt/shared'
import BracketMatchCard from '@/components/tournament/BracketMatchCard'

/** A bracket drawn as columns of rounds, with lines from each pair of matches to the one they feed. */
export default function BracketSection({ section }: { section: TournamentSectionView }) {
  return (
    <div className="bracket" role="group" aria-label={section.label}>
      {section.rounds.map((round, r) => {
        const next = section.rounds[r + 1]
        const join = !next ? 'none' : next.matches.length * 2 === round.matches.length ? 'pairs' : next.matches.length === round.matches.length ? 'straight' : 'none'
        // Pairs feed one match each in the next round.
        const groups = join === 'pairs' ? round.matches.flatMap((_, i) => (i % 2 === 0 ? [round.matches.slice(i, i + 2)] : [])) : round.matches.map((m) => [m])
        return (
          <section key={round.label} className="bracket-round" data-join={join} aria-label={round.label}>
            <h4 className="bracket-round-title">{round.label}</h4>
            <div className="bracket-round-matches">
              {groups.map((group) => (
                <div key={group[0]!.id} className="bracket-pair">
                  {group.map((m) => (
                    <BracketMatchCard key={m.id} match={m} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
