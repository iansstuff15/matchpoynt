import type { PaymentQrView, PlayerPaymentView } from '@matchpoynt/shared'
import { CircleCheck, QrCode, Wallet } from 'lucide-react'
import PaymentStatusBadge from '@/components/invoices/PaymentStatusBadge'
import PaymentQrList from '@/components/play/PaymentQrList'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paymentMethods } from '@/config/fees'
import { formatMoney } from '@/utils/forms/money'
import { formatWhen } from '@/utils/time/formatWhen'

interface PlayerPaymentCardProps {
  payment: PlayerPaymentView | null
  qrs: PaymentQrView[]
}

/**
 * What the player owes for a session: the amount, what they've paid (each
 * payment, cash or online) and what's left, with the club's QR codes to pay
 * with up front while anything is left. Once paid, the QR codes stay one tap away.
 */
export default function PlayerPaymentCard({ payment, qrs }: PlayerPaymentCardProps) {
  if (!payment && !qrs.length) return null
  const money = (minor: number) => (payment ? formatMoney(minor, payment.currency) : '')
  const owing = Boolean(payment && payment.balance > 0)
  return (
    <Card data-play-reveal aria-labelledby="player-payment-title" className={owing ? 'border-warning/60' : undefined}>
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="player-payment-title" className="flex items-center gap-2 text-lg">
            <Wallet className="size-5" aria-hidden />
            Your payment
          </h2>
        </CardTitle>
        <CardDescription>
          {!payment
            ? 'You owe nothing for this session.'
            : owing
              ? `${money(payment.balance)} left to pay of ${money(payment.amount)} (${payment.breakdown}).`
              : `Paid in full: ${money(payment.amount)} (${payment.breakdown}). Thanks!`}
        </CardDescription>
        {payment && (
          <CardAction>
            <PaymentStatusBadge invoice={{ ...payment, id: '', playerId: null, name: '', games: null, paidAt: null }} currency={payment.currency} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {payment && payment.payments.length > 0 && (
          <ul className="grid gap-1.5 text-sm" aria-label="Your payments">
            {payment.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <CircleCheck className="size-4 text-success-foreground" aria-hidden />
                <span className="font-medium tabular-nums">{money(p.amount)}</span>
                {p.method && <Badge variant="outline">{paymentMethods[p.method]}</Badge>}
                <span className="text-muted-foreground">{formatWhen(p.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {qrs.length > 0 &&
          (owing ? (
            <section aria-labelledby="player-pay-with-title" className="grid gap-3">
              <h3 id="player-pay-with-title" className="flex items-center gap-2 font-semibold">
                <QrCode className="size-4" aria-hidden />
                Pay with
              </h3>
              <PaymentQrList qrs={qrs} />
              <p className="text-xs text-muted-foreground">After paying, show the club your receipt so they can mark it paid.</p>
            </section>
          ) : (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">The club's payment QR codes</summary>
              <div className="pt-3">
                <PaymentQrList qrs={qrs} />
              </div>
            </details>
          ))}
      </CardContent>
    </Card>
  )
}
