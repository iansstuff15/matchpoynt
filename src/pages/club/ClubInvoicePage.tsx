import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import InvoiceGroupCard from '@/components/invoices/InvoiceGroupCard'
import InvoiceGroupCardSkeleton from '@/components/invoices/InvoiceGroupCardSkeleton'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { useAccountingActions, useManualInvoice } from '@/utils/hooks/useAccounting'
import { useClubPage } from '@/utils/hooks/useClubPage'
import { useSessionInvoices } from '@/utils/hooks/useInvoices'

/**
 * One invoice of the club on its own page (`/clubs/<id>/invoices/<manual|session>/<id>`):
 * everyone who owes, what they've paid (in part or in full, cash or online),
 * what's left, and recording payments; a manual invoice can be deleted here.
 */
export default function ClubInvoicePage() {
  const { view } = useClubPage()
  const { kind = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const manual = kind === 'manual'
  const manualQuery = useManualInvoice(view.club.id, groupId, manual)
  const sessionQuery = useSessionInvoices(groupId, !manual)
  const invoice = manual ? manualQuery : sessionQuery
  const { deleteInvoice } = useAccountingActions(view.club.id)
  const back = `/clubs/${view.club.id}/invoices`
  const group = invoice.data ?? null

  return (
    <section aria-label="Invoice" className="grid gap-4">
      <PageMeta title={`${group?.label ?? 'Invoice'} · ${view.club.name}`} description={`An invoice of ${view.club.name}: who owes, what they've paid and what's left.`} />
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to={back}>
          <ArrowLeft />
          All invoices
        </Link>
      </Button>
      {Boolean(deleteInvoice.error) && deleteInvoice.variables && (
        <ErrorBanner error={deleteInvoice.error} action={`delete ${deleteInvoice.variables.title}`} onRetry={() => deleteInvoice.variables && deleteInvoice.mutate(deleteInvoice.variables)} />
      )}
      {invoice.isError ? (
        <ErrorBanner error={invoice.error} action="open this invoice" onRetry={() => void invoice.refetch()} />
      ) : invoice.isPending ? (
        <InvoiceGroupCardSkeleton />
      ) : !group ? (
        <p className="text-sm text-muted-foreground">This session had no fee, so it has no invoices.</p>
      ) : (
        <InvoiceGroupCard
          group={group}
          linkSession
          deleting={deleteInvoice.isPending}
          onDelete={manual ? () => deleteInvoice.mutate({ id: group.id, title: group.label }, { onSuccess: () => navigate(back, { replace: true }) }) : undefined}
        />
      )}
    </section>
  )
}
