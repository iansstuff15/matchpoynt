import { NavLink } from 'react-router'
import HeaderCta from '@/components/layout/site/HeaderCta'
import MobileNav from '@/components/layout/site/MobileNav'
import { webNavigation } from '@/config/navigation'
import { site } from '@/config/site'
import { cn } from '@/utils/cn'
import { useNavigation } from '@/utils/hooks/useNavigation'

/** Floating glass pill: brand mark, links with icons, and one highlighted action. */
export default function SiteHeader() {
  const nav = useNavigation(webNavigation)
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-5">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/60 bg-background/75 p-1.5 shadow-lg backdrop-blur-xl">
        <NavLink to="/" aria-label={`${site.name} home`} className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
          <img src="/favicon.svg" alt="" width={24} height={24} className="size-6" />
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
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
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
        <MobileNav />
      </div>
    </header>
  )
}
