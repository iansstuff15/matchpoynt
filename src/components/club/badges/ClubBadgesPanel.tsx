import type { ClubBadgeView } from '@matchpoynt/shared'
import { clubBadgeLimits } from '@matchpoynt/shared'
import { Award, Plus } from 'lucide-react'
import { useState } from 'react'
import ClubBadgeCard from '@/components/club/badges/ClubBadgeCard'
import ClubBadgeDialog from '@/components/club/badges/ClubBadgeDialog'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubBadgesPanelProps {
  badges: ClubBadgeView[]
  actions: ReturnType<typeof useClubActions>
}

/** Badges tab: the club's own badges, with conditions and GIF or image icons. */
export default function ClubBadgesPanel({ badges, actions }: ClubBadgesPanelProps) {
  const [editing, setEditing] = useState<ClubBadgeView | 'new' | null>(null)
  const { saveBadge, setBadgeIcon, deleteBadge } = actions
  const open = (next: ClubBadgeView | 'new') => {
    saveBadge.reset()
    setBadgeIcon.reset()
    setEditing(next)
  }

  return (
    <section aria-labelledby="club-badges-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="club-badges-title" className="font-display text-xl font-semibold">
            Badges
          </h2>
          <p className="text-sm text-muted-foreground">Your club's own badges, shown on the leaderboards of the sessions it runs.</p>
        </div>
        <Button onClick={() => open('new')} disabled={badges.length >= clubBadgeLimits.maxBadges}>
          <Plus />
          New badge
        </Button>
      </div>

      {badges.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Award />
            </EmptyMedia>
            <EmptyTitle>No club badges yet</EmptyTitle>
            <EmptyDescription>Create one, e.g. "Smash King: at least 5 wins in one session", and give it a GIF.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="club-card-grid" aria-label="Club badges">
          {badges.map((badge) => (
            <li key={badge.id}>
              <ClubBadgeCard
                badge={badge}
                deleting={deleteBadge.isPending && deleteBadge.variables?.badgeId === badge.id}
                onEdit={() => open(badge)}
                onDelete={() => deleteBadge.mutate({ badgeId: badge.id, name: badge.name })}
              />
            </li>
          ))}
        </ul>
      )}

      <ClubBadgeDialog badge={editing} actions={actions} onOpenChange={(next) => !next && setEditing(null)} />
    </section>
  )
}
