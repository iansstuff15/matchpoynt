import { Link } from 'react-router'
import LogoMark from '@/components/brand/LogoMark'
import ClubAvatar from '@/components/club/ClubAvatar'
import { site } from '@/config/site'
import { cn } from '@/utils/cn'
import { homePath } from '@/utils/platform'
import { usePlayerClub } from '@/utils/hooks/usePlayerClub'

interface LogoProps {
  href?: string
  className?: string
}

/**
 * The logo, linking home. Its ink arch takes the link's text colour; the other
 * arch the club's accent. A player playing with a club sees the club's photo
 * instead, linking back to the club picker to switch.
 */
export default function Logo({ href = homePath(), className }: LogoProps) {
  const { club } = usePlayerClub()
  if (club) {
    return (
      <Link to="/choose-club" className={cn('inline-flex items-center', className)} aria-label={`Playing with ${club.name}: switch club`} title={`${club.name}: switch club`}>
        <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-8 text-xs" />
      </Link>
    )
  }
  return (
    <Link to={href} className={cn('inline-flex items-center', className)} aria-label={`${site.name} home`} title={`${site.name} home`}>
      <LogoMark className="h-7 w-auto" />
    </Link>
  )
}
