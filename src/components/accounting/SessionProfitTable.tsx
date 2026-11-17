import type { AccountingSessionView, CurrencyCode } from '@matchpoynt/shared'
import { Link } from 'react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/utils/forms/money'
import { formatWhen } from '@/utils/time/formatWhen'

/** Each club session's takings less its own expenses, newest first. */
export default function SessionProfitTable({ sessions, currency }: { sessions: AccountingSessionView[]; currency: CurrencyCode }) {
  const money = (minor: number) => formatMoney(minor, currency)
  return (
    <Table className="table-fixed" aria-label="Earnings by session">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Session</TableHead>
          <TableHead className="hidden w-28 text-right md:table-cell">Invoiced</TableHead>
          <TableHead className="hidden w-28 text-right sm:table-cell">Collected</TableHead>
          <TableHead className="hidden w-28 text-right lg:table-cell">Owed</TableHead>
          <TableHead className="w-28 text-right">Spent</TableHead>
          <TableHead className="w-28 text-right">Net</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.sessionId}>
            <TableCell>
              <Link to={`/app/${s.sessionId}`} className="block truncate font-medium hover:underline" title={s.label}>
                {s.label}
              </Link>
              <span className="block truncate text-xs text-muted-foreground">{formatWhen(s.endedAt)}</span>
            </TableCell>
            <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{money(s.invoiced)}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{money(s.collected)}</TableCell>
            <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">{money(s.outstanding)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(s.expenses)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{money(s.net)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
