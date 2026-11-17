import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { invoiceColumns } from '@/config/fees'

/** Same frame as InvoiceTable: its columns, a few rows and the total. */
export default function InvoiceTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {invoiceColumns.map((col) => (
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
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto size-4" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-4 w-20" />
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
