import { feeDefaults, type ClubView, type ManualInvoiceInput } from '@matchpoynt/shared'
import { ChevronDown, Plus, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import DateRangeFilter from '@/components/accounting/DateRangeFilter'
import ManualInvoiceDialog from '@/components/accounting/ManualInvoiceDialog'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import InvoiceList from '@/components/accounting/InvoiceList'
import InvoicesSkeleton from '@/components/invoices/InvoicesSkeleton'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { toDay } from '@/utils/forms/dateRange'
import { useAccountingActions, useClubInvoices } from '@/utils/hooks/useAccounting'
import { useDateRange } from '@/utils/hooks/useDateRange'

/** The club's invoices for a period, as a list: ones made by hand (with "New invoice") and its sessions', newest first, a page at a time; each opens its own page. */
export default function ClubInvoicesPanel({ view }: { view: ClubView }) {
  const clubId = view.club.id
  const dates = useDateRange()
  const invoices = useClubInvoices(clubId, dates.range)
  const groups = invoices.data?.pages.flatMap((p) => p.groups) ?? []
  const { addInvoice } = useAccountingActions(clubId)
  // The new invoice's starting values, made when the dialog opens (it starts today).
  const [draft, setDraft] = useState<ManualInvoiceInput | null>(null)
  const open = () => {
    addInvoice.reset()
    setDraft({ title: '', notes: null, currency: view.club.fee?.currency ?? feeDefaults.currency, issuedOn: toDay(new Date()), amount: 0, split: 'each', payers: [] })
  }

  return (
    <section aria-labelledby="club-invoices-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="club-invoices-title" className="font-display text-xl font-semibold">
            Invoices
          </h2>
          <p className="text-sm text-muted-foreground">Invoices you make for anything outside a session, and your sessions' fees. Open one to record who has paid, in part or in full.</p>
        </div>
        <Button onClick={open}>
          <Plus />
          New invoice
        </Button>
      </div>
      <DateRangeFilter filter={dates} />

      {invoices.isError ? (
        <ErrorBanner error={invoices.error} action="load the club's invoices" onRetry={() => void invoices.refetch()} />
      ) : invoices.isPending ? (
        <InvoicesSkeleton />
      ) : groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptText />
            </EmptyMedia>
            <EmptyTitle>No invoices in this period</EmptyTitle>
            <EmptyDescription>Create one for dues, shirts or entry fees, or pick another period.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
        <InvoiceList clubId={clubId} groups={groups} />
        {invoices.hasNextPage && (
          <Button variant="outline" className="mx-auto flex" disabled={invoices.isFetchingNextPage} onClick={() => void invoices.fetchNextPage()}>
            <ChevronDown />
            Show older invoices
          </Button>
        )}
        </>
      )}

      <ManualInvoiceDialog
        open={draft !== null}
        initial={draft ?? ({} as ManualInvoiceInput)}
        members={view.members}
        pending={addInvoice.isPending}
        error={addInvoice.error}
        onOpenChange={(next) => !next && setDraft(null)}
        onSubmit={(invoice) => addInvoice.mutate(invoice, { onSuccess: () => setDraft(null) })}
      />
    </section>
  )
}
