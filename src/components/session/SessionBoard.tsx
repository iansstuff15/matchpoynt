import type { CourtView, SessionView } from '@matchpoynt/shared'
import { useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import BoardTools from '@/components/session/BoardTools'
import CourtCard from '@/components/session/CourtCard'
import FinishMatchDialog from '@/components/session/FinishMatchDialog'
import TournamentSetupDialog from '@/components/tournament/TournamentSetupDialog'
import { newTournamentDraft } from '@/utils/forms/tournamentDraft'
import { useFeatures } from '@/utils/hooks/useFeatures'
import type { Sport } from '@/interfaces/Sport'
import type { useSessionActions } from '@/utils/hooks/useSession'

interface SessionBoardProps {
  session: SessionView
  /** Device clock correction, so court timers follow the API's clock. */
  clockOffsetMs: number
  sport: Sport
  actions: ReturnType<typeof useSessionActions>
}

/**
 * Management tab: adding players and courts (a collapsible row), then the courts.
 * The queue is the page's side panel (SessionPage); both sit in one BoardDnd, so
 * players drag between them. Every move goes to the API.
 */
export default function SessionBoard({ session, sport, actions, clockOffsetMs }: SessionBoardProps) {
  const [finishingCourtId, setFinishingCourtId] = useState<string | null>(null)
  const finishingCourt = session.courts.find((c) => c.id === finishingCourtId && c.status === 'playing') ?? null
  const { startMatch, restartMatch, cancelMatch, removeCourt, finishMatch, unassignPlayer, failure, clearFailure } = actions
  const automatic = session.rules.queueing === 'automatic'
  const { web } = useFeatures()
  // The court whose switch was turned on with no tournament running: setup opens for it.
  const [settingUp, setSettingUp] = useState<CourtView | null>(null)
  const { createTournament, setCourtTournament } = actions
  const switchTournament = (court: CourtView, on: boolean) => {
    if (on && session.tournament?.status !== 'active') {
      createTournament.reset()
      setSettingUp(court)
    } else setCourtTournament.mutate({ courtId: court.id, on })
  }

  return (
    <div className="space-y-6">
      <BoardTools session={session} sport={sport} actions={actions} />
      {failure && <ErrorBanner error={failure.error} action={failure.action} onRetry={failure.retry} onDismiss={clearFailure} />}
      <ul aria-label="Courts" className="grid gap-4 sm:grid-cols-2">
        {session.courts.map((court) => (
          <li key={court.id}>
            <CourtCard
              court={court}
              perSide={session.playersPerSide}
              automatic={automatic}
              starting={startMatch.isPending && startMatch.variables === court.id}
              clockOffsetMs={clockOffsetMs}
              tournamentsOn={web.tournaments}
              switchingTournament={setCourtTournament.isPending && setCourtTournament.variables?.courtId === court.id}
              onTournamentChange={(on) => switchTournament(court, on)}
              onStart={() => startMatch.mutate(court.id)}
              onFinish={() => {
                finishMatch.reset()
                setFinishingCourtId(court.id)
              }}
              onRestart={() => restartMatch.mutate(court.id)}
              restarting={restartMatch.isPending && restartMatch.variables === court.id}
              onCancel={() => cancelMatch.mutate(court.id)}
              cancelling={cancelMatch.isPending && cancelMatch.variables === court.id}
              onRemove={() => removeCourt.mutate(court.id)}
              removing={removeCourt.isPending && removeCourt.variables === court.id}
              onUnassign={(playerId) => unassignPlayer.mutate(playerId)}
            />
          </li>
        ))}
      </ul>

      <FinishMatchDialog
        court={finishingCourt}
        sport={sport}
        formatId={session.scoring.formatId}
        pending={finishMatch.isPending}
        error={finishMatch.error}
        onOpenChange={(open) => !open && setFinishingCourtId(null)}
        onSubmit={(input) => finishMatch.mutate({ courtId: finishingCourtId ?? '', input }, { onSuccess: () => setFinishingCourtId(null) })}
        onRetry={(input) => finishMatch.mutate({ courtId: finishingCourtId ?? '', input }, { onSuccess: () => setFinishingCourtId(null) })}
      />

      {web.tournaments && (
        <TournamentSetupDialog
          open={settingUp !== null}
          courtLabel={settingUp?.label ?? ''}
          initial={newTournamentDraft(session, settingUp?.id ?? '', `${sport.name} tournament`)}
          players={session.players.filter((p) => p.checkedIn)}
          perSide={session.playersPerSide}
          pending={createTournament.isPending}
          error={createTournament.error}
          onOpenChange={(open) => !open && setSettingUp(null)}
          onSubmit={(input) => createTournament.mutate(input, { onSuccess: () => setSettingUp(null) })}
        />
      )}
    </div>
  )
}
