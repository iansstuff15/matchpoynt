import { NavLink } from 'react-router'
import LiquidGlass from '@/components/brand/LiquidGlass'
import LogoMark from '@/components/brand/LogoMark'
import HeaderCta from '@/components/layout/site/HeaderCta'
import { webNavigation } from '@/config/navigation'
import { site } from '@/config/site'
import { cn } from '@/utils/cn'
import { useNavigation } from '@/utils/hooks/useNavigation'

/** Floating liquid-glass pill (LiquidGlass): brand mark, links with icons, and one highlighted action. On phones it spans the screen, logo left and action right, and the links are tabs at the bottom instead (SiteTabBar). */
export default function SiteHeader() {
  const nav = useNavigation(webNavigation)
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-5">
      <LiquidGlass className="pointer-events-auto relative flex w-full items-center justify-between gap-1 rounded-full p-1.5 md:w-auto md:justify-start">
        <NavLink to="/" aria-label={`${site.name} home`} title={`${site.name} home`} className="flex h-9 items-center justify-center rounded-full px-2.5 text-logo-ink hover:bg-muted">
          <LogoMark className="h-6 w-auto" />
        </NavLink>
        <nav aria-label="Main" className="hidden items-center md:flex">
          {nav.map(({ label, href, icon: Icon, description }) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/'}
              title={description}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <HeaderCta className="ml-1" />
      </LiquidGlass>
    </header>
  )
}
