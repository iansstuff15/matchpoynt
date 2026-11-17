import ExpensesPanel from '@/components/accounting/ExpensesPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/expenses`: what the club spends, club-wide and per session. */
export default function ClubExpensesPage() {
  const { view } = useClubPage()
  return (
    <>
      <PageMeta title={`Expenses · ${view.club.name}`} description={`${view.club.name}'s expenses, club-wide and per session, linked to its billers.`} />
      <ExpensesPanel view={view} />
    </>
  )
}
