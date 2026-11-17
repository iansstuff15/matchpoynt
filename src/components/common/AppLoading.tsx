import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import PublicLeaderboardSkeleton from '@/components/leaderboard/PublicLeaderboardSkeleton'
import PublicTournamentSkeleton from '@/components/tournament/PublicTournamentSkeleton'
import AppShellSkeleton from '@/components/skeletons/AppShellSkeleton'
import SessionsOverviewSkeleton from '@/components/session/overview/SessionsOverviewSkeleton'
import HeroSkeleton from '@/components/skeletons/HeroSkeleton'
import PageSkeleton from '@/components/skeletons/PageSkeleton'
import SiteHeaderSkeleton from '@/components/skeletons/SiteHeaderSkeleton'
import { site } from '@/config/site'
import { isDesktop } from '@/utils/platform'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'
import { readSessionFlag } from '@/utils/motion/sessionFlag'

const authPaths = ['/sign-in', '/sign-up', '/complete-profile', '/forgot-password', '/reset-password', '/invite/', '/auth/', '/account/']

/**
 * Shown while feature toggles load, before any route renders. It matches the
 * page being opened, so the layout doesn't jump when the real page appears.
 */
export default function AppLoading() {
  const path = window.location.pathname
  // The session board with no session open: its running and previous sessions.
  if (path === '/app') {
    return (
      <AppShellSkeleton>
        <SessionsOverviewSkeleton />
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

  // The splash is about to play: a plain stage in its colour, so the landing page's skeleton never shows under it.
  if (path === '/' && !prefersReducedMotion() && !readSessionFlag(site.sessionKeys.splashSeen)) {
    return <div className="splash-root" aria-busy="true" aria-label="Loading Matchpoynt" />
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
