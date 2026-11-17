import type { PersonProfileView } from '@matchpoynt/shared'
import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import { Button } from '@/components/ui/button'

/** The top of someone's profile: their photo, @username, city, since when, and the friend button (or, on their own, a link to their profile). */
export default function PersonHero({ person, action }: { person: PersonProfileView; action: ReactNode }) {
  const name = `@${person.username}`
  return (
    <header className="flex flex-wrap items-center gap-4">
      <span className="profile-avatar relative overflow-hidden">
        <ClubAvatar name={person.username} url={person.avatarUrl} position={person.avatarPosition} className="size-full text-2xl" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h1 id="person-title" className="truncate font-display text-2xl font-bold sm:text-3xl" title={name}>
          {name}
        </h1>
        {person.city && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {person.city}
          </p>
        )}
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          On Matchpoynt since {new Date(person.memberSince).toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </p>
      </div>
      {person.isMe ? (
        <Button asChild variant="outline">
          <Link to="/profile">
            <UserRound />
            Your profile
          </Link>
        </Button>
      ) : (
        action
      )}
    </header>
  )
}
