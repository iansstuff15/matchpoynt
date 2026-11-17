import ErrorBanner from '@/components/feedback/ErrorBanner'
import InvoiceGroupCard from '@/components/invoices/InvoiceGroupCard'
import InvoiceGroupCardSkeleton from '@/components/invoices/InvoiceGroupCardSkeleton'
import { useSessionInvoices } from '@/utils/hooks/useInvoices'

/** A finished session's invoices on its page, for the club owner to mark who has paid. Nothing shows for a session without a fee. */
export default function SessionInvoices({ sessionId }: { sessionId: string }) {
  const invoices = useSessionInvoices(sessionId)
  if (invoices.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading invoices">
        <InvoiceGroupCardSkeleton />
      </div>
    )
  }
  if (invoices.isError) return <ErrorBanner error={invoices.error} action="load this session's invoices" onRetry={() => void invoices.refetch()} />
  return invoices.data ? <InvoiceGroupCard group={invoices.data} /> : null
}
