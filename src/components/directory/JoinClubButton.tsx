import type { DirectoryClubView } from '@matchpoynt/shared'
import { Check, Clock, DoorOpen, LoaderCircle, MailOpen, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { useJoining } from '@/utils/hooks/useDirectory'

interface JoinClubButtonProps {
  club: DirectoryClubView
  joining: ReturnType<typeof useJoining>
  size?: 'default' | 'lg'
  className?: string
}

/**
 * Where the viewer stands with a club, as its action: Join (at once, or a
 * request the owner approves, as the club chooses), the request waiting, an invite to accept, already a member, or
 * managing their own club.
 */
export default function JoinClubButton({ club, joining, size = 'default', className }: JoinClubButtonProps) {
  const { joinClub } = joining
  const busy = joinClub.isPending && joinClub.variables?.handle === club.handle
  const join = () => club.handle && joinClub.mutate({ handle: club.handle, name: club.name })
  switch (club.membership) {
    case 'owner':
      return (
        <Button asChild size={size} variant="outline" className={className}>
          <Link to={`/clubs/${club.id}`}>
            <Settings />
            Manage club
          </Link>
        </Button>
      )
    case 'member':
      return (
        <Button size={size} variant="secondary" className={className} disabled>
          <Check />
          Member
        </Button>
      )
    case 'requested':
      return (
        <Button size={size} variant="secondary" className={className} disabled>
          <Clock />
          Request sent
        </Button>
      )
    case 'invited':
      return (
        <Button size={size} className={className} onClick={join} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <MailOpen />}
          Accept invite
        </Button>
      )
    default:
      return (
        <Button
          size={size}
          className={className}
          onClick={join}
          disabled={busy}
          aria-label={`Join ${club.name}`}
          title={club.approval === 'auto' ? `Join ${club.name} now` : `Ask to join ${club.name}: the club approves requests`}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <DoorOpen />}
          Join
        </Button>
      )
  }
}
