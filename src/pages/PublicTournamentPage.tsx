import type { TournamentView } from '@matchpoynt/shared'
import { Radio } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import PublicTournamentSkeleton from '@/components/tournament/PublicTournamentSkeleton'
import TournamentBoard from '@/components/tournament/TournamentBoard'
import { Badge } from '@/components/ui/badge'
import { sports } from '@/config/sports'
import { notifyChange } from '@/utils/feedback/notify'
import { resultLine, tournamentFormatLabel } from '@/utils/feedback/tournamentMessages'
import { usePublicTournament } from '@/utils/hooks/useLeaderboard'

const clock = (time: number) => new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Finished matches by id, to spot new results between refreshes. */
const finished = (t: TournamentView) => t.sections.flatMap((s) => s.rounds.flatMap((r) => r.matches)).filter((m) => m.status === 'done')

/** What players and spectators see from a published tournament link. Read-only, refreshes on its own. */
export default function PublicTournamentPage() {
  const { slug = '' } = useParams()
  const { data, isPending, isError, error, dataUpdatedAt, refetch } = usePublicTournament(slug)
  const sport = data ? sports[data.sportId] : null
  const Icon = sport?.icon
  const t = data?.tournament

  // Announce results that arrive while the page is open (not the ones already there on load).
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!t) return
    const done = finished(t)
    if (seen.current) for (const m of done) if (!seen.current.has(m.id)) notifyChange(`${m.label}: new result`, resultLine(m))
    seen.current = new Set(done.map((m) => m.id))
  }, [t])

  const live = data?.sessionStatus === 'active' && t?.status === 'active'

  return (
    <section aria-labelledby="public-title" className="section">
      <PageMeta
        title={t ? t.name : 'Tournament'}
        description={t ? `${t.name}: live bracket, results and champion of a ${sport?.name ?? ''} ${tournamentFormatLabel(t.format).toLowerCase()} tournament.` : 'A live Matchpoynt tournament: bracket, results and champion.'}
      />
      {isPending ? (
        <PublicTournamentSkeleton />
      ) : !data || !sport || !t ? (
        <div className="container-page">
          <ErrorBanner error={error} action="open this tournament" onRetry={() => void refetch()} />
        </div>
      ) : (
        <div className="container-page space-y-8">
          <div className="space-y-3">
            <p className="section-eyebrow">
              {sport.name} · {tournamentFormatLabel(t.format)}
            </p>
            <h1 id="public-title" className="section-title flex items-center gap-3">
              {Icon && <Icon className="size-8 shrink-0" aria-hidden />}
              <span className="min-w-0 break-words">{t.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={live ? 'default' : 'secondary'}>
                {live && <Radio aria-hidden />}
                {live ? 'Live · updates automatically' : t.status === 'finished' ? 'Finished' : 'Session ended'}
              </Badge>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t.matchesPlayed} of {t.matchesTotal} matches played
              </span>
            </div>
          </div>
          {isError && (
            <ErrorBanner error={error} action={`refresh the tournament. Showing it as of ${clock(dataUpdatedAt)}`} onRetry={() => void refetch()} />
          )}
          <TournamentBoard tournament={t} />
        </div>
      )}
    </section>
  )
}
