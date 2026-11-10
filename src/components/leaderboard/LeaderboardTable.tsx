import type { ClubBadgeView, LeaderboardEntry } from '@matchpoynt/shared'
import { Flame } from 'lucide-react'
import HotStreakTag from '@/components/leaderboard/HotStreakTag'
import ClubBadgeChip from '@/components/leaderboard/ClubBadgeChip'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import MovementTag from '@/components/leaderboard/MovementTag'
import PlayerShareButton from '@/components/leaderboard/share/PlayerShareButton'
import PlayerAvatar from '@/components/leaderboard/PlayerAvatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { hotStreakBadge, leaderboardColumns } from '@/config/leaderboard'
import type { Sport } from '@/interfaces/Sport'

interface LeaderboardTableProps {
  sport: Sport
  /** Places 4 and down, ranked by the server. */
  entries: LeaderboardEntry[]
  /** The public leaderboard's address, for share images; `null` when not published. */
  shareUrl: string | null
  /** The club's own badges, to show the ones each player earned. */
  clubBadges: ClubBadgeView[]
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

export default function LeaderboardTable({ sport, entries, shareUrl, clubBadges }: LeaderboardTableProps) {
  const tierLabel = (tierId: string) => sport.tiers.find((t) => t.id === tierId)?.label ?? tierId
  const unit = `${sport.terminology.scoreUnit}s`

  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {leaderboardColumns.map((col) => (
              <TableHead key={col.key} className={col.className} title={col.key === 'diff' ? `${unit} won minus ${unit} lost` : undefined}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => {
            const hot = e.badges.includes(hotStreakBadge)
            return (
            <TableRow key={e.playerId} data-board-row data-flip-id={e.playerId}>
              <TableCell>
                <span className="flex items-center gap-2 font-semibold tabular-nums">
                  <span data-rank-value={e.rank}>{e.rank}</span>
                  <MovementTag movement={e.movement} />
                </span>
              </TableCell>
              <TableCell>
                <span className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar name={e.name} />
                  {/* Table columns grow to fit their content, so the name gets a width cap to cut long ones with "…". */}
                  <span className="block max-w-40 min-w-0 sm:max-w-64">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium" title={e.name}>
                        {e.name}
                      </span>
                      {hot && <HotStreakTag streak={e.streak} />}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{tierLabel(e.tierId)}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">{e.played}</TableCell>
              <TableCell className="hidden md:table-cell">
                {e.streak > 0 ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="size-3.5 text-warning" aria-hidden />
                    {e.streak}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="flex flex-wrap gap-1">
                  {e.badges.filter((b) => b !== hotStreakBadge).map((b) => (
                    <LeaderboardBadgeChip key={b} id={b} />
                  ))}
                  {clubBadges
                    .filter((b) => e.clubBadges.includes(b.id))
                    .map((b) => (
                      <ClubBadgeChip key={b.id} badge={b} />
                    ))}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {e.wins}–{e.losses}
              </TableCell>
              <TableCell className="text-right tabular-nums">{signed(e.pointsFor - e.pointsAgainst)}</TableCell>
              <TableCell className="text-right">
                <PlayerShareButton entry={e} sport={sport} shareUrl={shareUrl} clubBadges={clubBadges.filter((b) => e.clubBadges.includes(b.id))} />
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
