import ClubBadgesPanel from '@/components/club/badges/ClubBadgesPanel'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/badges`: the club's own badges. */
export default function ClubBadgesPage() {
  const { view, actions } = useClubPage()
  return (
    <>
      <PageMeta title={`Badges · ${view.club.name}`} description={`${view.club.name}'s own badges, earned on its sessions' leaderboards.`} />
      <ClubBadgesPanel badges={view.badges} actions={actions} />
    </>
  )
}
