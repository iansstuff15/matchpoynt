import type { ReactNode } from 'react'
import LogoMark from '@/components/brand/LogoMark'
import { Link } from 'react-router'
import { homePath } from '@/utils/platform'
import PhotoCredit from '@/components/auth/PhotoCredit'
import ConnectionBanner from '@/components/feedback/ConnectionBanner'
import { site } from '@/config/site'
import type { AuthPhoto } from '@/interfaces/AuthPhoto'

const year = new Date().getFullYear()

interface AuthLayoutProps {
  photo: AuthPhoto
  children: ReactNode
}

/**
 * Full-bleed photo with the form card on the right, brand top-left
 * and the photo credit bottom-right. Sign in, sign up and password pages share
 * it; each passes its own photo.
 */
export default function AuthLayout({ photo, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh flex-col bg-deep-strong">
      <img
        src={photo.src}
        alt={photo.alt}
        style={{ objectPosition: photo.focus }}
        className="absolute inset-0 size-full object-cover"
        referrerPolicy="no-referrer"
        decoding="async"
      />
      {/* Darker on the right, where the card sits, so text over the photo stays readable. */}
      <div className="absolute inset-0 bg-linear-to-l from-black/60 via-black/25 to-transparent" aria-hidden />
      {/* And along the bottom, for the footer and the photo credit. */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black/60 to-transparent" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to={homePath()} className="inline-flex items-center text-white" aria-label={`${site.name} home`} title={`${site.name} home`}>
          <LogoMark className="h-8 w-auto" />
        </Link>
      </header>

      <main id="main" className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 sm:px-10 lg:justify-end lg:pr-[8vw]">
        <div className="grid w-full max-w-[28rem] gap-4">
          <ConnectionBanner />
          {children}
        </div>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-white/80 sm:px-10">
        <p>
          © {year} {site.name}
        </p>
        <PhotoCredit photo={photo} />
      </footer>
    </div>
  )
}
