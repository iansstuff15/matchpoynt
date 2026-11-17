import type { AccountingBillerView, CurrencyCode } from '@matchpoynt/shared'
import { formatMoney } from '@/utils/forms/money'

/** Where the money went: spending by biller, biggest first, each with its share of the total. */
export default function BillerSpendList({ billers, currency }: { billers: AccountingBillerView[]; currency: CurrencyCode }) {
  const total = billers.reduce((sum, b) => sum + b.expenses, 0)
  return (
    <ul className="grid gap-3" aria-label="Spending by biller">
      {billers.map((b) => (
        <li key={b.billerId ?? 'none'} className="grid gap-1">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{b.name}</span>
            <span className="tabular-nums">{formatMoney(b.expenses, currency)}</span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${total ? (b.expenses / total) * 100 : 0}%`, background: 'var(--chart-spent)' }} />
          </span>
          <span className="text-xs text-muted-foreground">
            {b.count} {b.count === 1 ? 'expense' : 'expenses'}
          </span>
        </li>
      ))}
    </ul>
  )
}
