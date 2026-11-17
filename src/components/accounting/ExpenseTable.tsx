import type { ExpenseView } from '@matchpoynt/shared'
import { Building2, CalendarDays, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { expenseColumns } from '@/config/accounting'
import { formatMoney } from '@/utils/forms/money'
import { formatDay } from '@/utils/time/formatDay'

interface ExpenseTableProps {
  clubId: string
  expenses: ExpenseView[]
}

/** The club's expenses as a list, newest first: when, what, what for, who was paid, and how much; each row opens the expense's own page. */
export default function ExpenseTable({ clubId, expenses }: ExpenseTableProps) {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4">
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
          {expenses.map((e) => {
            const ForIcon = e.scope === 'session' ? CalendarDays : Building2
            const forLabel = e.sessionLabel ?? 'Whole club'
            return (
              <TableRow key={e.id} className="relative">
                <TableCell className="text-muted-foreground tabular-nums">
                  <time dateTime={e.spentOn}>{formatDay(e.spentOn)}</time>
                </TableCell>
                <TableCell>
                  <Link to={`/clubs/${clubId}/expenses/${e.id}`} className="block truncate font-medium after:absolute after:inset-0 hover:underline" title={e.description} aria-label={`${e.description}: open the expense`}>
                    {e.description}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground lg:hidden">
                    {forLabel}
                    {e.billerName ? ` · ${e.billerName}` : ''}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={forLabel}>
                    <ForIcon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{forLabel}</span>
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="block truncate text-muted-foreground">{e.billerName ?? '—'}</span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatMoney(e.amount, e.currency)}</TableCell>
                <TableCell className="text-muted-foreground">
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
