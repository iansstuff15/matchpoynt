import type { TournamentView } from '@matchpoynt/shared'
import { Crown } from 'lucide-react'

/** The tournament's winner, once decided. */
export default function ChampionBanner({ champion, name }: { champion: NonNullable<TournamentView['champion']>; name: string }) {
  return (
    <section aria-label="Champion" className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
      <Crown className="size-10 shrink-0 fill-gold text-gold" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm opacity-80">{name} champion</p>
        <p className="truncate font-display text-2xl font-bold sm:text-3xl" title={champion.label}>
          {champion.players.map((p) => p.name).join(' & ') || champion.label}
        </p>
      </div>
    </section>
  )
}
