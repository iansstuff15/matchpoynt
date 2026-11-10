import { CalendarX2 } from 'lucide-react'
import { useParams } from 'react-router'
import CheckInDone from '@/components/checkin/CheckInDone'
import CheckInRoster from '@/components/checkin/CheckInRoster'
import CheckInRosterSkeleton from '@/components/checkin/CheckInRosterSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { sports } from '@/config/sports'
import { useCheckIn, useCheckInRoster } from '@/utils/hooks/useCheckIn'

/** Where a player's phone lands after scanning the session's check-in QR. No sign-in. */
export default function CheckInPage() {
  const { slug = '' } = useParams()
  const roster = useCheckInRoster(slug)
  const checkIn = useCheckIn(slug)
  const sport = roster.data ? sports[roster.data.sportId] : null
  const Icon = sport?.icon

  return (
    <section aria-labelledby="check-in-title" className="section">
      <PageMeta title="Session check-in" description="Check in to a Matchpoynt session so you can be matched onto a court." />
      <div className="container-page max-w-md space-y-6">
        <div className="space-y-3">
          <p className="section-eyebrow">Session check-in</p>
          {roster.isPending ? (
            <Skeleton className="h-11 w-64" />
          ) : (
            <h1 id="check-in-title" className="section-title flex items-center gap-3">
              {Icon && <Icon className="size-8" aria-hidden />}
              {sport ? `${sport.name} session` : 'Check in'}
            </h1>
          )}
        </div>

        {checkIn.isSuccess ? (
          <CheckInDone name={checkIn.data.name} />
        ) : roster.isPending ? (
          <CheckInRosterSkeleton />
        ) : roster.isError ? (
          <ErrorBanner error={roster.error} action="open this check-in" onRetry={() => void roster.refetch()} />
        ) : roster.data.status === 'ended' ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX2 />
              </EmptyMedia>
              <EmptyTitle>This session has ended</EmptyTitle>
              <EmptyDescription>Check-in is closed. Scan the QR code for today's session instead.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <CheckInRoster
            players={roster.data.players}
            pending={checkIn.isPending}
            error={checkIn.error}
            onCheckIn={(playerId) => checkIn.mutate({ playerId })}
          />
        )}
      </div>
    </section>
  )
}
