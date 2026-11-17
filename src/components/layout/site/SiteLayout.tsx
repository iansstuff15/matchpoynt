import { Outlet, useLocation } from 'react-router'
import ConnectionBanner from '@/components/feedback/ConnectionBanner'
import SiteFooter from '@/components/layout/site/SiteFooter'
import SiteHeader from '@/components/layout/site/SiteHeader'
import SiteTabBar from '@/components/layout/site/SiteTabBar'
import { cn } from '@/utils/cn'

/** Website shell: floating header, page, dusk footer, and on phones a tab bar at the bottom. The home hero runs under the header; other pages start below it. */
export default function SiteLayout() {
  const home = useLocation().pathname === '/'
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main" className={cn('flex-1', !home && 'pt-20 sm:pt-24')}>
        <div className="container-page empty:hidden pt-4">
          <ConnectionBanner />
        </div>
        <Outlet />
      </main>
      <SiteFooter />
      <SiteTabBar />
    </div>
  )
}
