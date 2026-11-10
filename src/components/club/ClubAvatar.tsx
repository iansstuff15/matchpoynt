import type { PhotoPosition } from '@matchpoynt/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/utils/cn'

interface ClubAvatarProps {
  name: string
  url: string | null
  /** Where the photo sits in the circle (set in the photo editor); centred when left out. */
  position?: PhotoPosition
  className?: string
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** A club's profile photo, or its initials until one is uploaded. */
export default function ClubAvatar({ name, url, position, className }: ClubAvatarProps) {
  const point = position ? `${position.x}% ${position.y}%` : undefined
  return (
    <Avatar className={cn('rounded-full', className)}>
      {url && (
        <AvatarImage
          src={url}
          alt={`${name} profile photo`}
          className="object-cover"
          style={position ? { objectPosition: point, transformOrigin: point, transform: position.zoom === 1 ? undefined : `scale(${position.zoom})` } : undefined}
        />
      )}
      <AvatarFallback className="rounded-full bg-muted font-display font-semibold text-foreground">{initials(name) || '?'}</AvatarFallback>
    </Avatar>
  )
}
