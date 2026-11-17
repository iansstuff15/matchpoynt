import InvoiceGroupCardSkeleton from '@/components/invoices/InvoiceGroupCardSkeleton'
import { invoiceSkeletonGroups } from '@/config/fees'

/** The Invoices page while it loads: the same list of session cards. */
export default function InvoicesSkeleton() {
  return (
    <ul className="grid gap-6" aria-busy="true" aria-label="Loading invoices">
      {Array.from({ length: invoiceSkeletonGroups }, (_, i) => (
        <li key={i}>
          <InvoiceGroupCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
