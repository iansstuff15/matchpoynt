import { Award, CalendarDays, Info, Users } from 'lucide-react'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import BackToClubs from '@/components/club/BackToClubs'
import ClubHero from '@/components/club/ClubHero'
import ClubInfoPanel from '@/components/club/ClubInfoPanel'
import ClubManagerSkeleton from '@/components/club/ClubManagerSkeleton'
import ClubMembersPanel from '@/components/club/ClubMembersPanel'
import ClubSessionsPanel from '@/components/club/ClubSessionsPanel'
import ClubBadgesPanel from '@/components/club/badges/ClubBadgesPanel'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { clubTabs } from '@/config/club'
import type { ClubTab } from '@/types/club'
import { useClub, useClubActions } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'
import { remember } from '@/utils/platform/remember'

/** One club's manager page: sessions (planned and past), members, and the club's info and photos. */
export default function ClubManagerPage() {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()
  const club = useClub(clubId)
  const [params] = useSearchParams()
  const { web } = useFeatures()
  // The tab follows the URL, so the sidebar's club links switch it on this page too. Badges only while they're on.
  const tabs = clubTabs.filter((t) => t !== 'badges' || web.clubBadges)
  const tab = tabs.find((t) => t === params.get('tab')) ?? clubTabs[0]
  useEffect(() => {
    if (club.isSuccess) remember('club', clubId)
  }, [club.isSuccess, clubId])
  // A started plan is the running session: the board takes over.
  const actions = useClubActions(clubId, (session) => navigate(`/app/${session.id}`))

  // Deleted: back to the list.
  if (actions.deleteClub.isSuccess) return <Navigate to="/clubs" replace />

  return (
    <section aria-labelledby="club-title" className="app-page">
      <PageMeta
        title={club.data ? club.data.club.name : 'Club'}
        description={club.data?.club.description ?? 'Manage a club: members, planned sessions, description and photos.'}
      />
      {club.isPending ? (
        <ClubManagerSkeleton />
      ) : club.isError ? (
        <>
          <BackToClubs />
          <h1 id="club-title" className="sr-only">
            Club
          </h1>
          <ErrorBanner error={club.error} action="load the club" onRetry={() => void club.refetch()} />
        </>
      ) : (
        <>
          <BackToClubs />
          <ClubHero club={club.data.club} actions={actions} />
          {actions.failure && (
            <ErrorBanner error={actions.failure.error} action={actions.failure.action} onRetry={actions.failure.retry} onDismiss={actions.clearFailure} />
          )}
          <Tabs value={tab} onValueChange={(next) => navigate(clubPageHref(clubId, next as ClubTab), { replace: true })}>
            <TabsList>
              <TabsTrigger value="sessions">
                <CalendarDays aria-hidden />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users aria-hidden />
                Members
              </TabsTrigger>
              {web.clubBadges && (
                <TabsTrigger value="badges">
                  <Award aria-hidden />
                  Badges
                </TabsTrigger>
              )}
              <TabsTrigger value="info">
                <Info aria-hidden />
                Club info
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sessions" className="mt-6">
              <ClubSessionsPanel view={club.data} actions={actions} />
            </TabsContent>
            <TabsContent value="members" className="mt-6">
              <ClubMembersPanel clubName={club.data.club.name} members={club.data.members} badges={club.data.badges} actions={actions} />
            </TabsContent>
            {web.clubBadges && (
              <TabsContent value="badges" className="mt-6">
                <ClubBadgesPanel badges={club.data.badges} actions={actions} />
              </TabsContent>
            )}
            <TabsContent value="info" className="mt-6">
              <ClubInfoPanel club={club.data.club} actions={actions} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  )
}
