import type { SessionView } from '@matchpoynt/shared'
import { Info, XCircle } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'
import PublishLinkButton from '@/components/common/PublishLinkButton'
import StatusBanner from '@/components/feedback/StatusBanner'
import TournamentBoard from '@/components/tournament/TournamentBoard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { publishCopy } from '@/config/publish'
import { tournamentFormatLabel } from '@/utils/feedback/tournamentMessages'
import { useFeatures } from '@/utils/hooks/useFeatures'
import type { useSessionActions } from '@/utils/hooks/useSession'

interface TournamentPanelProps {
  tournament: NonNullable<SessionView['tournament']>
  actions: ReturnType<typeof useSessionActions>
}

/** The Tournament tab: progress, publishing and cancelling, then the bracket with start buttons for ready matches. */
export default function TournamentPanel({ tournament, actions }: TournamentPanelProps) {
  const { web } = useFeatures()
  const { startTournamentMatch, cancelTournament, publishTournament, unpublishTournament } = actions
  const done = tournament.matchesTotal ? Math.round((tournament.matchesPlayed / tournament.matchesTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="truncate font-display text-xl font-semibold" title={tournament.name}>
            {tournament.name}
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{tournamentFormatLabel(tournament.format)}</Badge>
            {tournament.teamMode === 'rotating' && <Badge variant="outline">Rotating partners</Badge>}
            <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'}>{tournament.status === 'active' ? 'In progress' : 'Finished'}</Badge>
            {tournament.courtLabels.length > 0 && <span>Courts: {tournament.courtLabels.join(', ')}</span>}
          </p>
          <div className="flex items-center gap-3">
            <Progress value={done} className="h-1.5 w-40" aria-label={`${done}% of matches played`} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {tournament.matchesPlayed} of {tournament.matchesTotal} matches played
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {web.publishTournaments && (
            <PublishLinkButton
              copy={publishCopy.tournament}
              publicUrl={tournament.publicUrl}
              publishing={publishTournament.isPending}
              unpublishing={unpublishTournament.isPending}
              error={publishTournament.error ?? unpublishTournament.error}
              onPublish={() => publishTournament.mutate()}
              onUnpublish={() => unpublishTournament.mutate()}
            />
          )}
          <ConfirmButton
            label={tournament.status === 'active' ? 'Cancel tournament' : 'Close tournament'}
            icon={XCircle}
            variant="outline"
            title={tournament.status === 'active' ? `Cancel ${tournament.name}?` : `Close ${tournament.name}?`}
            description="Its courts go back to open play and its players rejoin the queue. Matches already played stay on the leaderboard; the bracket and its public link are removed."
            confirmLabel={tournament.status === 'active' ? 'Cancel tournament' : 'Close tournament'}
            cancelLabel="Keep it"
            pending={cancelTournament.isPending}
            onConfirm={() => cancelTournament.mutate()}
          />
        </div>
      </div>

      {tournament.hint && <StatusBanner variant="info" icon={Info} title={tournament.hint} />}

      <TournamentBoard
        tournament={tournament}
        onStart={(m) => startTournamentMatch.mutate(m)}
        startingId={startTournamentMatch.isPending ? (startTournamentMatch.variables?.id ?? null) : null}
      />
    </div>
  )
}
