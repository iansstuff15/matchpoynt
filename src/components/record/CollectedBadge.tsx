import type { ProfileBadgeEarned, SportId } from '@matchpoynt/shared'
import type { ReactNode } from 'react'
import SportTag from '@/components/record/SportTag'
import { formatWhen } from '@/utils/time/formatWhen'

interface CollectedBadgeProps {
  icon: ReactNode
  name: string
  /** Under the name: the club, or what the badge is for. */
  detail: string
  times: number
  sportIds: SportId[]
  earnedIn: (ProfileBadgeEarned & { clubName?: string })[]
  lastEarnedAt: string | null
  /** A career badge is held, not earned per session. */
  career?: boolean
}

/** One badge in the collection: how many times, in which sports, and the sessions it came from. */
export default function CollectedBadge({ icon, name, detail, times, sportIds, earnedIn, lastEarnedAt, career = false }: CollectedBadgeProps) {
  const sessions = earnedIn.map((e) => (e.clubName ? `${e.sessionLabel} (${e.clubName})` : e.sessionLabel))
  return (
    <li className="grid gap-2 rounded-xl border p-3">
      <span className="flex items-center gap-3">
        {icon}
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        <span className="font-display text-xl font-bold tabular-nums" aria-label={`Earned ${times} ${times === 1 ? 'time' : 'times'}`}>
          ×{times}
        </span>
      </span>
      {sportIds.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {sportIds.map((id) => (
            <SportTag key={id} sportId={id} />
          ))}
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {career ? 'Career badge: held for your record at this club' : `Earned in ${sessions.slice(0, 3).join(', ')}${sessions.length > 3 ? ` and ${sessions.length - 3} more` : ''}`}
        {lastEarnedAt && ` · last ${formatWhen(lastEarnedAt)}`}
      </span>
    </li>
  )
}
