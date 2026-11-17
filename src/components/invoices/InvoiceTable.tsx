import type { InvoiceGroupView } from '@matchpoynt/shared'
import InvoicePaymentsDialog from '@/components/invoices/InvoicePaymentsDialog'
import PaymentStatusBadge from '@/components/invoices/PaymentStatusBadge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { invoiceColumns } from '@/config/fees'
import { formatMoney } from '@/utils/forms/money'

interface InvoiceTableProps {
  group: InvoiceGroupView
  /** Invoice being marked right now, and what it's being marked as: its box shows that until the API answers. */
  pending: { invoiceId: string; paid: boolean } | null
  onPaidChange: (invoice: InvoiceGroupView['invoices'][number], paid: boolean) => void
}

const paidOn = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

/** One session's invoices, by name: what each player owes, how it was worked out, where their payments stand, and a tick for paid in full. */
export default function InvoiceTable({ group, pending, onPaidChange }: InvoiceTableProps) {
  const money = (minor: number) => formatMoney(minor, group.currency)
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {invoiceColumns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.key === 'name' && group.kind === 'manual' ? 'Payer' : col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {group.invoices.map((invoice) => {
          const paid = invoice.paidAt !== null
          const marking = pending?.invoiceId === invoice.id
          return (
            <TableRow key={invoice.id} data-state={paid ? 'selected' : undefined}>
              <TableCell>
                <span className="block truncate font-medium" title={invoice.name}>
                  {invoice.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground md:hidden">{invoice.breakdown}</span>
                {invoice.status !== 'unpaid' && (
                  <span className="mt-1 block">
                    <PaymentStatusBadge invoice={invoice} currency={group.currency} />
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="block truncate text-muted-foreground" title={invoice.breakdown}>
                  {invoice.breakdown}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(invoice.amount)}</TableCell>
              <TableCell>
                <span className="flex items-center justify-end gap-1" title={invoice.paidAt ? `Paid in full ${paidOn(invoice.paidAt)}` : invoice.status === 'partial' ? 'Paid in part' : 'Not paid yet'}>
                  <InvoicePaymentsDialog group={group} invoice={invoice} />
                  <Checkbox
                    checked={marking ? pending.paid : paid}
                    disabled={marking}
                    aria-label={`${invoice.name} paid ${money(invoice.amount)}`}
                    onCheckedChange={(checked) => onPaidChange(invoice, checked === true)}
                  />
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell className="font-medium">Total</TableCell>
          <TableCell className="hidden text-muted-foreground md:table-cell">
            {group.paidCount} of {group.invoices.length} paid{group.partialCount ? `, ${group.partialCount} in part` : ''}
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{money(group.total)}</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
