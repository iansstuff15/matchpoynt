import type { TournamentMatchView, TournamentView } from '@matchpoynt/shared'
import BracketSection from '@/components/tournament/BracketSection'
import ChampionBanner from '@/components/tournament/ChampionBanner'
import PoolSection from '@/components/tournament/PoolSection'
import TournamentMatchList from '@/components/tournament/TournamentMatchList'

interface TournamentBoardProps {
  tournament: TournamentView
  /** Owner view only: start a ready match. */
  onStart?: (match: TournamentMatchView) => void
  startingId?: string | null
}

/** One layout for the Tournament tab and the public page: champion, matches on court and up next, then every bracket and pool. */
export default function TournamentBoard({ tournament, onStart, startingId }: TournamentBoardProps) {
  return (
    <div className="space-y-8">
      {tournament.champion && <ChampionBanner champion={tournament.champion} name={tournament.name} />}

      {(tournament.playing.length > 0 || tournament.upNext.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {tournament.playing.length > 0 && <TournamentMatchList title="On court now" matches={tournament.playing} />}
          {tournament.upNext.length > 0 && <TournamentMatchList title="Up next" matches={tournament.upNext} onStart={onStart} startingId={startingId} />}
        </div>
      )}

      {tournament.sections.map((section) => (
        <section key={section.id} aria-labelledby={`tournament-${section.id}`} className="space-y-3">
          <h3 id={`tournament-${section.id}`} className="font-display text-lg font-semibold">
            {section.label}
          </h3>
          {section.kind === 'pool' ? (
            <PoolSection section={section} />
          ) : section.rounds.length ? (
            <BracketSection section={section} />
          ) : (
            <p className="text-sm text-muted-foreground">Drawn once every pool match has a result.</p>
          )}
        </section>
      ))}
    </div>
  )
}
