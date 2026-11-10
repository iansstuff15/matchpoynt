import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { leaderboardColumns } from '@/config/leaderboard'

/** Same frame, columns and row height as LeaderboardTable. */
export default function LeaderboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4" aria-hidden>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {leaderboardColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <span className="grid gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </span>
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="ml-auto h-4 w-5" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-[22px] w-24 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-6" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
