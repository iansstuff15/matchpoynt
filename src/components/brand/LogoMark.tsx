import { useId, type Ref } from 'react'
import { cn } from '@/utils/cn'

interface LogoMarkProps {
  className?: string
  /** Read out instead of hiding the mark from screen readers; leave out when a label sits next to it. */
  title?: string
  ref?: Ref<SVGSVGElement>
}

/**
 * The Matchpoynt logo: two interlocking arches. The ink arch takes the text
 * colour it sits on (navy on the site, the sidebar's text in the app); the
 * other is `--logo-accent`, which a club's accent replaces, so the logo wears
 * the club's colours wherever its theme is applied. Each arch is marked with
 * `data-logo-arch` so the splash can crash them together.
 */
export default function LogoMark({ className, title, ref }: LogoMarkProps) {
  // Several logos can be on screen at once (sidebar, splash, footer), so each gets its own mask.
  const mask = `logo-cut-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  return (
    <svg
      ref={ref}
      viewBox="60 134 392 244"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('logo-mark', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {/* Where the accent arch passes over the ink arch, the ink arch is cut away, so they interlock. */}
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
        <rect width="512" height="512" fill="#fff" />
        <path data-logo-cut="" d="M215,231.8 A108,108 0 0 1 319.3,162.1" fill="none" stroke="#000" strokeWidth="72" />
      </mask>
      <g mask={`url(#${mask})`}>
        <path data-logo-arch="ink" className="logo-arch-ink" d="M88,350 V270 A108,108 0 0 1 304,270 V350" />
      </g>
      <path data-logo-arch="accent" className="logo-arch-accent" d="M208,350 V270 A108,108 0 0 1 424,270 V350" />
    </svg>
  )
}
