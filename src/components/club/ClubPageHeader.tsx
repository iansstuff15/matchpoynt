import type { ClubSummary } from '@matchpoynt/shared'
import { Settings } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'
import { Button } from '@/components/ui/button'

interface ClubPageHeaderProps {
  club: ClubSummary
  onSettings: () => void
}

/** The top of a club's pages other than the dashboard: its avatar and name, and the settings button. */
export default function ClubPageHeader({ club, onSettings }: ClubPageHeaderProps) {
  return (
    <header className="flex items-center gap-3">
      <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-11" />
      <div className="min-w-0 flex-1">
        <h1 id="club-title" className="truncate font-display text-2xl font-bold" title={club.name}>
          {club.name}
        </h1>
        {club.handle && <p className="truncate text-sm text-muted-foreground">@{club.handle}</p>}
      </div>
      <Button variant="ghost" size="icon" onClick={onSettings} aria-label={`${club.name} settings`} title="Club settings">
        <Settings />
      </Button>
    </header>
  )
}
