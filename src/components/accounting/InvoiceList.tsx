import type { InvoiceGroupView } from '@matchpoynt/shared'
import { CalendarDays, ChevronRight, CircleCheck, Hourglass, ReceiptText } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { invoiceListColumns } from '@/config/accounting'
import { invoiceHref } from '@/utils/hooks/useSelectedClub'
import { formatMoney } from '@/utils/forms/money'
import { formatDay } from '@/utils/time/formatDay'
import { formatWhen } from '@/utils/time/formatWhen'

/** The club's invoices as a list, newest first: each a row (what for, when, collected of total, where it stands) opening its own page. */
export default function InvoiceList({ clubId, groups }: { clubId: string; groups: InvoiceGroupView[] }) {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {invoiceListColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const manual = g.kind === 'manual'
            const Icon = manual ? ReceiptText : CalendarDays
            const money = (minor: number) => formatMoney(minor, g.currency)
            return (
              <TableRow key={`${g.kind}-${g.id}`} className="relative">
                <TableCell>
                  <Link to={invoiceHref(clubId, g)} className="flex min-w-0 items-center gap-2 font-medium after:absolute after:inset-0 hover:underline" aria-label={`${g.label}: open its invoice`}>
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{g.label}</span>
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground md:hidden">{manual ? formatDay(g.date) : formatWhen(g.date)}</span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">{manual ? formatDay(g.date) : formatWhen(g.date)}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {money(g.paid)} <span className="text-muted-foreground">of {money(g.total)}</span>
                </TableCell>
                <TableCell className="text-right">
                  {g.outstanding === 0 ? (
                    <Badge variant="secondary" className="gap-1">
                      <CircleCheck aria-hidden />
                      {g.invoices.length ? 'All paid' : 'Nothing owed'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 tabular-nums">
                      <Hourglass aria-hidden />
                      {money(g.outstanding)} owed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="w-8 text-muted-foreground">
                  <ChevronRight className="size-4" aria-hidden />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
