import { Link } from 'react-router'
import { site } from '@/config/site'
import { cn } from '@/utils/cn'

interface LogoProps {
  href?: string
  className?: string
}

/** Brand mark and wordmark, linking home. */
export default function Logo({ href = '/', className }: LogoProps) {
  return (
    <Link
      to={href}
      className={cn('inline-flex items-center gap-2 font-display text-lg font-bold', className)}
      aria-label={`${site.name} home`}
    >
      <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
      <span>{site.name}</span>
    </Link>
  )
}
