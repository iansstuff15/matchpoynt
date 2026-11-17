import BillersPanel from '@/components/accounting/BillersPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/billers`: who the club pays. */
export default function ClubBillersPage() {
  const { view } = useClubPage()
  return (
    <>
      <PageMeta title={`Billers · ${view.club.name}`} description={`Who ${view.club.name} pays: venues, suppliers and coaches.`} />
      <BillersPanel clubId={view.club.id} />
    </>
  )
}
