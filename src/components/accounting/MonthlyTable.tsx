import type { AccountingMonthView, CurrencyCode } from '@matchpoynt/shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/utils/forms/money'

/** Every month's figures, newest first: the chart's values as a table. */
export default function MonthlyTable({ months, currency }: { months: AccountingMonthView[]; currency: CurrencyCode }) {
  const money = (minor: number) => formatMoney(minor, currency)
  return (
    <Table aria-label="Earnings by month" className="text-xs sm:text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Month</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Invoiced</TableHead>
          <TableHead className="text-right">Collected</TableHead>
          <TableHead className="text-right">Spent</TableHead>
          <TableHead className="text-right">Net</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...months].reverse().map((m) => (
          <TableRow key={m.month}>
            <TableCell className="font-medium">
              <span className="sm:hidden">{m.label.replace(/ (\d{2})(\d{2})$/, " '$2")}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </TableCell>
            <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{money(m.invoiced)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(m.collected)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(m.expenses)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{money(m.net)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
