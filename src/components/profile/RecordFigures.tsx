import type { ProfileStats } from '@matchpoynt/shared'
import { cn } from '@/utils/cn'

/** A record as figures: sessions, matches, wins, losses and win rate. */
export default function RecordFigures({ stats, compact = false }: { stats: ProfileStats; compact?: boolean }) {
  const figures = [
    { label: 'Sessions', value: String(stats.sessions) },
    { label: 'Matches', value: String(stats.played) },
    { label: 'Wins', value: String(stats.wins) },
    { label: 'Losses', value: String(stats.losses) },
    { label: 'Win rate', value: stats.winRate === null ? '—' : `${stats.winRate}%` },
  ]
  return (
    <dl className={cn('grid grid-cols-3 gap-4 sm:grid-cols-5', compact && 'gap-3')}>
      {figures.map((f) => (
        <div key={f.label} className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className={cn('font-display font-bold tabular-nums', compact ? 'text-base' : 'text-xl')}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
