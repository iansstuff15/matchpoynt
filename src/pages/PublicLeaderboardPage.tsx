import { Radio } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PublicLeaderboardSkeleton from '@/components/leaderboard/PublicLeaderboardSkeleton'
import LeaderboardBoard from '@/components/leaderboard/LeaderboardBoard'
import PageMeta from '@/components/seo/PageMeta'
import { Badge } from '@/components/ui/badge'
import { sports } from '@/config/sports'
import { notifyChange } from '@/utils/feedback/notify'
import { sideNames } from '@/utils/feedback/sessionMessages'
import { usePublicLeaderboard } from '@/utils/hooks/useLeaderboard'

const clock = (time: number) => new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** What players see from a published link. Read-only, refreshes on its own. */
export default function PublicLeaderboardPage() {
  const { slug = '' } = useParams()
  const { data, isPending, isError, error, dataUpdatedAt, refetch } = usePublicLeaderboard(slug)
  const sport = data ? sports[data.sportId] : null
  const Icon = sport?.icon

  // Announce results that arrive while the page is open (not the ones already there on load).
  const latestSeen = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const latest = data?.recentMatches[0]
    if (!data) return
    if (latestSeen.current !== undefined && latest && latest.id !== latestSeen.current) {
      notifyChange(`New result on ${latest.courtLabel}`, `${sideNames(latest.sides[0])} vs ${sideNames(latest.sides[1])}`)
    }
    latestSeen.current = latest?.id ?? null
  }, [data])

  return (
    <section aria-labelledby="public-title" className="section">
      <PageMeta
        title={sport ? `${sport.name} session leaderboard` : 'Session leaderboard'}
        description="Live standings and recent results from a Matchpoynt session."
      />
      {isPending ? (
        <PublicLeaderboardSkeleton />
      ) : !data || !sport ? (
        <div className="container-page">
          <ErrorBanner error={error} action="open this leaderboard" onRetry={() => void refetch()} />
        </div>
      ) : (
        <div className="container-page space-y-8">
          <div className="space-y-3">
            <p className="section-eyebrow">Session leaderboard</p>
            <h1 id="public-title" className="section-title flex items-center gap-3">
              {Icon && <Icon className="size-8" aria-hidden />}
              {sport.name} session
            </h1>
            <Badge variant={data.status === 'active' ? 'default' : 'secondary'}>
              {data.status === 'active' && <Radio aria-hidden />}
              {data.status === 'active' ? 'Live · updates automatically' : 'Session ended'}
            </Badge>
          </div>
          {isError && (
            <ErrorBanner
              error={error}
              action={`refresh the leaderboard. Showing results as of ${clock(dataUpdatedAt)}`}
              onRetry={() => void refetch()}
            />
          )}
          <LeaderboardBoard sport={sport} data={data} shareUrl={window.location.href} />
        </div>
      )}
    </section>
  )
}
