import AccountingPanel from '@/components/accounting/AccountingPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/accounting`: the club's earnings dashboard. */
export default function ClubAccountingPage() {
  const { view } = useClubPage()
  return (
    <>
      <PageMeta title={`Accounting · ${view.club.name}`} description={`${view.club.name}'s earnings by month: invoices collected less expenses.`} />
      <AccountingPanel clubId={view.club.id} />
    </>
  )
}
