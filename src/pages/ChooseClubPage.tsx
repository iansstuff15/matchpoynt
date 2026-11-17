import ClubPickerScreen from '@/components/directory/ClubPickerScreen'
import ClubPickerScreenSkeleton from '@/components/directory/ClubPickerScreenSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { useMyClubs } from '@/utils/hooks/useDirectory'

/**
 * The club picker players see when they sign in (`/choose-club`), full screen
 * and styled like a streaming service's profile screen: the clubs they're in
 * as logo cards, and Find clubs as a sheet in the bottom 30% of the screen.
 * It animates in once the clubs have loaded (`ClubPickerScreen`).
 */
export default function ChooseClubPage() {
  const clubs = useMyClubs()
  return (
    <>
      <PageMeta title="Your clubs" description="Pick the club you're playing with, or find a club to join." />
      {clubs.isError ? (
        <div className="full-screen-page club-picker">
          <div className="w-full max-w-xl">
            <ErrorBanner error={clubs.error} action="load your clubs" onRetry={() => void clubs.refetch()} />
          </div>
        </div>
      ) : clubs.isPending ? (
        <ClubPickerScreenSkeleton />
      ) : (
        <ClubPickerScreen clubs={clubs.data} />
      )}
    </>
  )
}
