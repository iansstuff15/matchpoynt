import ClubInvoicesPanel from '@/components/accounting/ClubInvoicesPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/invoices`: invoices the club made and its sessions' fees, with who has paid. */
export default function ClubInvoicesPage() {
  const { view } = useClubPage()
  return (
    <>
      <PageMeta title={`Invoices · ${view.club.name}`} description={`${view.club.name}'s invoices: made by the club and from its sessions, with who has paid.`} />
      <ClubInvoicesPanel view={view} />
    </>
  )
}
