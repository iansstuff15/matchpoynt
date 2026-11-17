import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { accountingSkeletonRows, expenseColumns } from '@/config/accounting'

/** Same frame as ExpenseTable: its columns and a few rows. */
export default function ExpenseTableSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4" aria-busy="true" aria-label="Loading expenses">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {expenseColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: accountingSkeletonRows }, (_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-16" />
              </TableCell>
              <TableCell>
                <span className="flex justify-end gap-1">
                  <Skeleton className="size-8" />
                  <Skeleton className="size-8" />
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
