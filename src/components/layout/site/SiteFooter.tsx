import { Link } from 'react-router'
import LogoMark from '@/components/brand/LogoMark'
import { webNavigation } from '@/config/navigation'
import { site } from '@/config/site'
import { sportList } from '@/config/sports'
import { useNavigation } from '@/utils/hooks/useNavigation'

const year = new Date().getFullYear()

/** Dusk footer with the big logo. Navigation without icons. */
export default function SiteFooter() {
  const nav = useNavigation(webNavigation)
  return (
    <footer className="footer-dusk">
      <div className="container-page grid gap-12 pt-24 pb-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <LogoMark title={site.name} className="w-[clamp(10rem,30vw,22rem)] text-deep-foreground" />
            <p className="mt-3 text-deep-muted">{site.tagline}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-12">
            <nav aria-label="Footer">
              <h2 className="eyebrow-mono">Explore</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {nav.map(({ label, href, description }) => (
                  <li key={href}>
                    <Link to={href} title={description} className="hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <h2 className="eyebrow-mono">Sports</h2>
              <ul className="mt-3 space-y-2 text-sm text-deep-muted">
                {sportList.map((sport) => (
                  <li key={sport.id}>{sport.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="eyebrow-mono border-t border-glass-border pt-6">
          © {year} {site.name} · v{site.version} · fair queues, full courts
        </p>
      </div>
    </footer>
  )
}
