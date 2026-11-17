import { Compass } from 'lucide-react'
import { Link, useParams } from 'react-router'
import ClubLoadingScreen from '@/components/club/ClubLoadingScreen'
import ClubTeamCard from '@/components/directory/club/ClubTeamCard'
import PlayerFeedbackCard from '@/components/directory/club/PlayerFeedbackCard'
import PlayerBadgesCard from '@/components/directory/club/PlayerBadgesCard'
import PlayerClubHero from '@/components/directory/club/PlayerClubHero'
import PlayerFeesCard from '@/components/directory/club/PlayerFeesCard'
import PlayerLeaderboardCard from '@/components/directory/club/PlayerLeaderboardCard'
import PlayerSessionsCard from '@/components/directory/club/PlayerSessionsCard'
import PlayerWelcomeCard from '@/components/directory/club/PlayerWelcomeCard'
import PlayerAnnouncementsCard from '@/components/announcements/PlayerAnnouncementsCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useClubPreview } from '@/utils/hooks/useClubPreview'
import { useJoining, usePlayerClub } from '@/utils/hooks/useDirectory'

/**
 * A club's page for players (`/c/<handle>`): its info, the join action, the
 * welcome and announcements for members, sessions running and coming up (members ask to join,
 * or follow their place in one running), the feedback form for members, the
 * club's team, badges to earn, fees and the club leaderboard. Nothing here edits the club.
 */
export default function PlayerClubPage() {
  const { handle = '' } = useParams()
  const { web } = useFeatures()
  const page = usePlayerClub(handle)
  const preview = useClubPreview({ handle })
  const joining = useJoining()

  return (
    <section aria-labelledby="player-club-title" className="app-page">
      <PageMeta
        title={page.data ? `${page.data.club.name} (@${page.data.club.handle})` : 'Club'}
        description={page.data?.club.description ?? 'A club on Matchpoynt: its sessions, badges, fees and leaderboard.'}
      />
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to="/choose-club">
          <Compass />
          Your clubs
        </Link>
      </Button>
      {page.isError ? (
        <ErrorBanner error={page.error} action="load the club" onRetry={() => void page.refetch()} />
      ) : !page.data ? (
        <ClubLoadingScreen preview={preview} />
      ) : (
        <>
          <PlayerClubHero page={page.data} joining={joining} />
          {page.data.welcome && <PlayerWelcomeCard clubName={page.data.club.name} message={page.data.welcome.message} links={page.data.welcome.links} />}
          {web.clubAnnouncements && page.data.memberId && <PlayerAnnouncementsCard handle={handle} />}
          <div className="player-club-grid">
            <PlayerSessionsCard page={page.data} joining={joining} />
            {web.clubFeedback && page.data.memberId && <PlayerFeedbackCard handle={handle} />}
            {page.data.team.length > 0 && <ClubTeamCard team={page.data.team} myRole={page.data.myRole} />}
            <PlayerLeaderboardCard standings={page.data.leaderboard} />
            {web.clubBadges && <PlayerBadgesCard badges={page.data.badges} />}
            {web.fees && <PlayerFeesCard summary={page.data.club.feeSummary} />}
          </div>
        </>
      )}
    </section>
  )
}
