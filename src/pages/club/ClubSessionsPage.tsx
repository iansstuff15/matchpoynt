import ClubSessionsPanel from '@/components/club/ClubSessionsPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/sessions`: the club's planned sessions and the sessions it has run. */
export default function ClubSessionsPage() {
  const { view, actions } = useClubPage()
  return (
    <>
      <PageMeta title={`Sessions · ${view.club.name}`} description={`${view.club.name}'s planned sessions and the sessions it has run.`} />
      <ClubSessionsPanel view={view} actions={actions} />
    </>
  )
}
