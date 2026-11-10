import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import PublicLeaderboardSkeleton from '@/components/leaderboard/PublicLeaderboardSkeleton'
import PublicTournamentSkeleton from '@/components/tournament/PublicTournamentSkeleton'
import AppShellSkeleton from '@/components/skeletons/AppShellSkeleton'
import PastSessionsSkeleton from '@/components/session/past/PastSessionsSkeleton'
import HeroSkeleton from '@/components/skeletons/HeroSkeleton'
import PageSkeleton from '@/components/skeletons/PageSkeleton'
import SiteHeaderSkeleton from '@/components/skeletons/SiteHeaderSkeleton'
import { isDesktop } from '@/utils/platform'

const authPaths = ['/sign-in', '/sign-up', '/complete-profile', '/forgot-password', '/reset-password', '/invite/']

/**
 * Shown while feature toggles load, before any route renders. It matches the
 * page being opened, so the layout doesn't jump when the real page appears.
 */
export default function AppLoading() {
  const path = window.location.pathname
  if (path === '/app/past') {
    return (
      <AppShellSkeleton>
        <PastSessionsSkeleton />
      </AppShellSkeleton>
    )
  }
  if (isDesktop() || path.startsWith('/app') || path.startsWith('/clubs')) return <AppShellSkeleton />
  if (authPaths.some((p) => path.startsWith(p))) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-deep-strong px-4 sm:px-10 lg:justify-end lg:pr-[8vw]" aria-busy="true" aria-label="Loading Matchpoynt">
        <div className="w-full max-w-[28rem]">
          <AuthCardSkeleton />
        </div>
      </div>
    )
  }

  const page =
    path === '/' ? (
      <HeroSkeleton />
    ) : path.startsWith('/s/') ? (
      <div className="section">
        <PublicLeaderboardSkeleton />
      </div>
    ) : path.startsWith('/t/') ? (
      <div className="section">
        <PublicTournamentSkeleton />
      </div>
    ) : (
      <PageSkeleton />
    )
  return (
    <div className="flex min-h-svh flex-col" aria-busy="true" aria-label="Loading Matchpoynt">
      <SiteHeaderSkeleton />
      <div className="flex-1">{page}</div>
    </div>
  )
}
