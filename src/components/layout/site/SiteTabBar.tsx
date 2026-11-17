import { NavLink } from 'react-router'
import LiquidGlass from '@/components/brand/LiquidGlass'
import { webNavigation } from '@/config/navigation'
import { cn } from '@/utils/cn'
import { useNavigation } from '@/utils/hooks/useNavigation'

/** Phones: the website's pages as tabs in a floating liquid-glass bar at the bottom of the screen. */
export default function SiteTabBar() {
  const nav = useNavigation(webNavigation)
  return (
    <LiquidGlass as="nav" aria-label="Tabs" className="site-tab-bar">
      {nav.map(({ label, tabLabel, href, icon: Icon, description }) => (
        <NavLink key={href} to={href} end={href === '/'} title={description} className={({ isActive }) => cn('tab-bar-item', isActive && 'tab-bar-item-active')}>
          <Icon aria-hidden />
          <span>{tabLabel ?? label}</span>
        </NavLink>
      ))}
    </LiquidGlass>
  )
}
