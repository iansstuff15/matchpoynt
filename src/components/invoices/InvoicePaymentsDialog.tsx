import type { InvoiceGroupView, InvoiceView, PaymentMethod } from '@matchpoynt/shared'
import { HandCoins, LoaderCircle, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import AmountField from '@/components/fees/AmountField'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PaymentMethodPicker from '@/components/invoices/PaymentMethodPicker'
import PaymentStatusBadge from '@/components/invoices/PaymentStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { paymentMethods } from '@/config/fees'
import { formatMoney } from '@/utils/forms/money'
import { useInvoicePayment } from '@/utils/hooks/useInvoices'
import { formatWhen } from '@/utils/time/formatWhen'

interface InvoicePaymentsDialogProps {
  group: InvoiceGroupView
  invoice: InvoiceView
}

/**
 * One person's payments: what they owe, paid and have left; each payment
 * (cash or online), removable; and recording another, a downpayment first
 * when the fee asks for one, otherwise what's left. Every check is the API's.
 */
export default function InvoicePaymentsDialog({ group, invoice }: InvoicePaymentsDialogProps) {
  const [open, setOpen] = useState(false)
  const money = (minor: number) => formatMoney(minor, group.currency)
  const suggested = invoice.paidAmount === 0 && group.downpayment ? Math.min(group.downpayment, invoice.balance) : invoice.balance
  const [amount, setAmount] = useState(suggested)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const payment = useInvoicePayment(group)

  const openWith = (next: boolean) => {
    if (next) {
      setAmount(suggested)
      payment.reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={openWith}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${invoice.name}'s payments`} title="Payments: record part or all of it, cash or online">
          <Wallet />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{invoice.name}'s payments</DialogTitle>
          <DialogDescription>
            {money(invoice.amount)} owed for {group.label}. {money(invoice.paidAmount)} paid, {money(invoice.balance)} left.
          </DialogDescription>
        </DialogHeader>
        <PaymentStatusBadge invoice={invoice} currency={group.currency} />
        {invoice.payments.length > 0 ? (
          <ul className="grid gap-2" aria-label={`Payments by ${invoice.name}`}>
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <span className="font-medium tabular-nums">{money(p.amount)}</span>
                <Badge variant="outline">{p.method ? paymentMethods[p.method] : 'Method not recorded'}</Badge>
                <span className="flex-1 truncate text-xs text-muted-foreground">{formatWhen(p.paidAt)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove the ${money(p.amount)} payment`}
                  disabled={payment.isPending}
                  onClick={() => payment.mutate({ kind: 'remove', invoiceId: invoice.id, name: invoice.name, paymentId: p.id })}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        )}
        {Boolean(payment.error) && (
          <ErrorBanner error={payment.error} action={`record ${invoice.name}'s payment`} onRetry={() => payment.variables && payment.mutate(payment.variables)} />
        )}
        {invoice.balance > 0 && (
          <form
            className="grid gap-4 border-t pt-4"
            aria-label="Record a payment"
            onSubmit={(e) => {
              e.preventDefault()
              payment.mutate({ kind: 'record', invoiceId: invoice.id, name: invoice.name, amount, method }, { onSuccess: () => setAmount(0) })
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <AmountField label="Amount paid" value={amount} currency={group.currency} onChange={setAmount} />
              {group.downpayment && invoice.paidAmount === 0 && amount !== Math.min(group.downpayment, invoice.balance) && (
                <Button type="button" variant="outline" size="sm" onClick={() => setAmount(Math.min(group.downpayment!, invoice.balance))}>
                  Downpayment
                </Button>
              )}
              {amount !== invoice.balance && (
                <Button type="button" variant="outline" size="sm" onClick={() => setAmount(invoice.balance)}>
                  All of it
                </Button>
              )}
            </div>
            <PaymentMethodPicker label="Paid in" value={method} onChange={setMethod} />
            <Button type="submit" className="justify-self-end" disabled={payment.isPending}>
              {payment.isPending ? <LoaderCircle className="animate-spin" /> : <HandCoins />}
              Record payment
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
