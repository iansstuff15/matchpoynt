import { clubBadgeScopes, type ClubBadgeView } from '@matchpoynt/shared'
import { Pencil, Trash2 } from 'lucide-react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ClubBadgeCardProps {
  badge: ClubBadgeView
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

/** One club badge: its icon, name, where it's earned and its conditions in plain words. */
export default function ClubBadgeCard({ badge, deleting, onEdit, onDelete }: ClubBadgeCardProps) {
  return (
    <Card className="club-badge-card" aria-label={`${badge.name} badge`}>
      <CardHeader className="flex flex-row items-start gap-4">
        <ClubBadgeIcon url={badge.iconUrl} name={badge.name} className="size-16 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-1">
          <CardTitle className="truncate font-display text-lg">{badge.name}</CardTitle>
          <Badge variant="secondary" className="w-fit">
            {clubBadgeScopes[badge.scope].label}
          </Badge>
          {badge.description && <CardDescription>{badge.description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm">{badge.summary}</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={onEdit} aria-label={`Edit the ${badge.name} badge`}>
            <Pencil />
            Edit
          </Button>
          <ConfirmButton
            iconOnly
            variant="ghost"
            label={`Delete the ${badge.name} badge`}
            icon={Trash2}
            title={`Delete the ${badge.name} badge?`}
            description="It disappears from every leaderboard, including past sessions. Results stay as they are."
            confirmLabel="Delete badge"
            pending={deleting}
            onConfirm={onDelete}
          />
        </div>
      </CardContent>
    </Card>
  )
}
