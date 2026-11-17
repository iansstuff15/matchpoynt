import type { ExpenseView } from '@matchpoynt/shared'
import { Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/utils/forms/money'
import { formatDay } from '@/utils/time/formatDay'

/** Everything about one expense: how much, when, what for (the whole club or a session), who was paid and the notes. */
export default function ExpenseDetails({ expense: e, actions }: { expense: ExpenseView; actions?: ReactNode }) {
  const rows = [
    { label: 'Amount', value: formatMoney(e.amount, e.currency) },
    { label: 'Spent on', value: formatDay(e.spentOn) },
    { label: 'For', value: e.sessionLabel ?? 'The whole club' },
    { label: 'Paid to', value: e.billerName ?? 'No biller' },
    { label: 'Notes', value: e.notes ?? '—' },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">
          <h2 className="flex items-center gap-2 text-xl">
            <Wallet className="size-5" aria-hidden />
            {e.description}
          </h2>
        </CardTitle>
        <CardDescription className="tabular-nums">{formatMoney(e.amount, e.currency)}</CardDescription>
        {actions && <CardAction className="flex flex-wrap gap-2">{actions}</CardAction>}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="whitespace-pre-line">{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
