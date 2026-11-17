import ClubMembersPanel from '@/components/club/ClubMembersPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/members`: the club's roster. */
export default function ClubMembersPage() {
  const { view, actions } = useClubPage()
  return (
    <>
      <PageMeta title={`Members · ${view.club.name}`} description={`${view.club.name}'s members: names, contacts, skill tiers and invites.`} />
      <ClubMembersPanel view={view} actions={actions} />
    </>
  )
}
