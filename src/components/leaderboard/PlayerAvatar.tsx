import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { avatarTones, podiumMedals } from '@/config/leaderboard'
import { cn } from '@/utils/cn'

interface PlayerAvatarProps {
  name: string
  /** Shows a medal with the place (1–3) on the avatar. */
  place?: number
  size?: 'sm' | 'lg'
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

/** The same name always gets the same colour. */
const tone = (name: string) => avatarTones[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % avatarTones.length]!


/** Initials avatar, optionally with a place medal (sessions have no profile photos). */
export default function PlayerAvatar({ name, place, size = 'sm' }: PlayerAvatarProps) {
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar className={size === 'lg' ? 'size-10 sm:size-14' : 'size-8'}>
        <AvatarFallback className={cn('font-semibold', size === 'lg' ? 'text-sm sm:text-lg' : 'text-xs', tone(name))}>{initials(name)}</AvatarFallback>
      </Avatar>
      {place && place <= 3 && (
        <span
          className={cn('absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-[0.65rem] font-bold ring-2 ring-card', podiumMedals[place as 1 | 2 | 3].badge)}
          aria-label={`Place ${place}`}
        >
          {place}
        </span>
      )}
    </span>
  )
}
