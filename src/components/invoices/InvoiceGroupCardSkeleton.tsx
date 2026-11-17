import InvoiceTableSkeleton from '@/components/invoices/InvoiceTableSkeleton'
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as InvoiceGroupCard: the header with its badge, the progress line and the table. */
export default function InvoiceGroupCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <CardAction>
          <Skeleton className="h-5 w-24 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
        <InvoiceTableSkeleton rows={rows} />
      </CardContent>
    </Card>
  )
}
