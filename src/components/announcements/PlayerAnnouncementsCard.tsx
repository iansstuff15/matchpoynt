import { Megaphone } from 'lucide-react'
import AnnouncementItem from '@/components/announcements/AnnouncementItem'
import AnnouncementsSkeleton from '@/components/announcements/AnnouncementsSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMemberAnnouncements } from '@/utils/hooks/useClubAnnouncements'

/** The club's newest announcements for its members, pinned first. Nothing while there are none. */
export default function PlayerAnnouncementsCard({ handle }: { handle: string }) {
  const list = useMemberAnnouncements(handle)
  if (list.data?.length === 0) return null
  return (
    <Card aria-labelledby="player-announcements-title">
      <CardHeader>
        <CardTitle id="player-announcements-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Megaphone className="size-5" aria-hidden />
          Announcements
        </CardTitle>
        <CardDescription>News from the club.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.isError ? (
          <ErrorBanner error={list.error} action="load the club's announcements" onRetry={() => void list.refetch()} />
        ) : !list.data ? (
          <AnnouncementsSkeleton count={2} />
        ) : (
          <ul className="grid gap-3" aria-label="Club announcements">
            {list.data.map((a) => (
              <AnnouncementItem key={a.id} announcement={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
