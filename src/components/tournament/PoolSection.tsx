import type { TournamentSectionView } from '@matchpoynt/shared'
import BracketMatchCard from '@/components/tournament/BracketMatchCard'
import StandingsTable from '@/components/tournament/StandingsTable'

/** A pool (or the round robin): its table, then its matches round by round. */
export default function PoolSection({ section }: { section: TournamentSectionView }) {
  return (
    <div className="grid gap-4">
      <StandingsTable rows={section.standings} label={section.label} />
      {section.rounds.map((round) => (
        <section key={round.label} aria-label={round.label} className="grid gap-2">
          <h4 className="bracket-round-title mb-0">{round.label}</h4>
          <div className="pool-matches">
            {round.matches.map((m) => (
              <BracketMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
