import type { InvoiceGroupView, PaymentMethod } from '@matchpoynt/shared'
import { useState } from 'react'
import PaymentMethodPicker from '@/components/invoices/PaymentMethodPicker'
import { CircleCheck, Hourglass, ReceiptText, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import ConfirmButton from '@/components/common/ConfirmButton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import InvoiceTable from '@/components/invoices/InvoiceTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { sports } from '@/config/sports'
import { formatMoney } from '@/utils/forms/money'
import { useMarkInvoicePaid } from '@/utils/hooks/useInvoices'
import { formatDay } from '@/utils/time/formatDay'
import { formatWhen } from '@/utils/time/formatWhen'

interface InvoiceGroupCardProps {
  group: InvoiceGroupView
  /** Titled with the session (linked to its page) or the invoice's title; "Invoices" on the session's own page. */
  linkSession?: boolean
  /** Deletes a manual invoice (confirmed first); left out where it can't be deleted. */
  onDelete?: () => void
  deleting?: boolean
}

/**
 * A finished session's invoices, or a manual invoice: what's owed, what's
 * been collected and what's still owed, and a row per person: paid in full
 * (a tick, recorded in cash or online), or payments in part (a downpayment,
 * then the rest) in its payments dialog.
 */
export default function InvoiceGroupCard({ group, linkSession = false, onDelete, deleting = false }: InvoiceGroupCardProps) {
  const markPaid = useMarkInvoicePaid(group)
  // How ticks record what's left: cash at the venue, or online.
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const money = (minor: number) => formatMoney(minor, group.currency)
  const titleId = `invoices-${group.id}`
  const settled = group.outstanding === 0
  const manual = group.kind === 'manual'
  const when = manual ? formatDay(group.date) : formatWhen(group.date)
  const source = manual ? 'Invoice' : group.sportId ? sports[group.sportId].name : null

  return (
    <Card role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId} className="flex items-center gap-2 font-display text-lg">
          {manual && <ReceiptText className="size-5 opacity-70" aria-hidden />}
          {manual || !linkSession ? (
            manual ? group.label : 'Invoices'
          ) : (
            <Link to={`/app/${group.sessionId}`} className="hover:underline" aria-label={`${group.label}: open the session's page`}>
              {group.label}
            </Link>
          )}
        </CardTitle>
        <CardDescription>
          {[source, group.clubName, linkSession || manual ? when : null].filter(Boolean).join(' · ')}
          {linkSession || manual ? <br /> : ' · '}
          {group.summary}
          {group.notes && (
            <>
              <br />
              {group.notes}
            </>
          )}
        </CardDescription>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          {settled ? (
            <Badge variant="secondary" className="gap-1">
              <CircleCheck aria-hidden />
              {group.invoices.length ? 'All paid' : 'Nothing owed'}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 tabular-nums">
              <Hourglass aria-hidden />
              {money(group.outstanding)} owed
            </Badge>
          )}
          {manual && onDelete && (
            <ConfirmButton
              iconOnly
              variant="ghost"
              label={`Delete ${group.label}`}
              icon={Trash2}
              title={`Delete ${group.label}?`}
              description="The invoice and every payer's paid tick are removed for good, and it no longer counts in the club's accounting."
              confirmLabel="Delete invoice"
              pending={deleting}
              onConfirm={onDelete}
            />
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {group.invoices.length > 0 && (
          <div className="grid gap-1.5">
            <Progress value={group.total ? (group.paid / group.total) * 100 : 0} aria-label={`${money(group.paid)} of ${money(group.total)} collected`} />
            <p className="text-sm text-muted-foreground tabular-nums">
              {money(group.paid)} of {money(group.total)} collected · {group.paidCount} of {group.invoices.length} {manual ? 'payers' : 'players'} paid
              {group.partialCount > 0 && `, ${group.partialCount} in part`}
            </p>
          </div>
        )}
        {group.outstanding > 0 && <PaymentMethodPicker label="Mark paid as" value={method} onChange={setMethod} />}
        {Boolean(markPaid.error) && markPaid.variables && (
          <ErrorBanner
            error={markPaid.error}
            action={`mark ${markPaid.variables.name} as ${markPaid.variables.paid ? 'paid' : 'unpaid'}`}
            onRetry={markPaid.isPending ? undefined : () => markPaid.variables && markPaid.mutate(markPaid.variables)}
          />
        )}
        {group.invoices.length ? (
          <InvoiceTable
            group={group}
            pending={markPaid.isPending ? (markPaid.variables ?? null) : null}
            onPaidChange={(invoice, paid) => markPaid.mutate({ invoiceId: invoice.id, name: invoice.name, paid, method })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Nobody owes anything for this session.</p>
        )}
      </CardContent>
    </Card>
  )
}
