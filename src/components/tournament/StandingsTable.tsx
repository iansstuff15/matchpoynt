import type { TournamentStandingView } from '@matchpoynt/shared'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { standingColumns } from '@/config/tournament'

/** A pool's or round robin's table, ranked by the API. Finishers who go through are marked. */
export default function StandingsTable({ rows, label }: { rows: TournamentStandingView[]; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-2">
      <Table className="table-fixed" aria-label={`${label} standings`}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {standingColumns.map((c) => (
              <TableHead key={c.key} className={c.className} title={c.title}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const diff = r.pointsFor - r.pointsAgainst
            return (
              <TableRow key={r.id}>
                <TableCell className="font-semibold tabular-nums">{r.rank}</TableCell>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium" title={r.label}>
                      {r.label}
                    </span>
                    {r.advancing && (
                      <Badge variant="outline" className="shrink-0">
                        Through
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.played}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.wins}–{r.losses}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{diff > 0 ? `+${diff}` : diff}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
