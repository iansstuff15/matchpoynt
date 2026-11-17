import type { InvoiceView } from '@matchpoynt/shared'
import { CircleCheck, CircleDashed, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/utils/forms/money'
import type { CurrencyCode } from '@matchpoynt/shared'

/** Where one invoice stands: paid in full, paid in part (with what's left), or not paid yet. */
export default function PaymentStatusBadge({ invoice, currency }: { invoice: InvoiceView; currency: CurrencyCode }) {
  if (invoice.status === 'paid') {
    return (
      <Badge variant="secondary" className="gap-1">
        <CircleCheck aria-hidden />
        Paid
      </Badge>
    )
  }
  if (invoice.status === 'partial') {
    return (
      <Badge variant="outline" className="gap-1 border-warning/50 tabular-nums">
        <CircleDot aria-hidden />
        Part paid · {formatMoney(invoice.balance, currency)} left
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleDashed aria-hidden />
      Unpaid
    </Badge>
  )
}
