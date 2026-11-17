import { useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import ProfileBadgesCard from '@/components/profile/ProfileBadgesCard'
import ProfileClubsCard from '@/components/profile/ProfileClubsCard'
import ProfileGamesCard from '@/components/profile/ProfileGamesCard'
import ProfileHero from '@/components/profile/ProfileHero'
import ProfileInfoCard from '@/components/profile/ProfileInfoCard'
import ProfilePageSkeleton from '@/components/profile/ProfilePageSkeleton'
import ProfileSettingsDialog from '@/components/profile/ProfileSettingsDialog'
import ProfileStatsCard from '@/components/profile/ProfileStatsCard'
import PageMeta from '@/components/seo/PageMeta'
import type { ProfileSettingsGroup } from '@/config/profileSettings'
import { useProfileActions, useProfilePage } from '@/utils/hooks/useProfile'

/**
 * The signed-in person's profile (`/profile`): photo, name and @username,
 * their details and links, record, badges, clubs and games. Editing is behind
 * the settings button; the photo changes by clicking it.
 */
export default function ProfilePage() {
  const page = useProfilePage()
  const actions = useProfileActions()
  const [settings, setSettings] = useState<ProfileSettingsGroup | null>(null)

  return (
    <section aria-labelledby="profile-title" className="app-page">
      <PageMeta title="Your profile" description="Your Matchpoynt profile: games played, badges earned, clubs, and your details and links." />
      {page.isError ? (
        <>
          <h1 id="profile-title" className="sr-only">
            Your profile
          </h1>
          <ErrorBanner error={page.error} action="load your profile" onRetry={() => void page.refetch()} />
        </>
      ) : page.isPending ? (
        <ProfilePageSkeleton />
      ) : (
        <>
          <ProfileHero page={page.data} actions={actions} onSettings={() => setSettings('details')} />
          <div className="club-dashboard-grid">
            <div className="grid content-start gap-6">
              <ProfileInfoCard page={page.data} onEdit={() => setSettings('details')} />
              <ProfileClubsCard clubs={page.data.clubs} />
            </div>
            <div className="grid content-start gap-6">
              <ProfileStatsCard stats={page.data.stats} />
              <ProfileBadgesCard page={page.data} />
            </div>
          </div>
          <ProfileGamesCard />
          <ProfileSettingsDialog page={page.data} actions={actions} group={settings} onGroupChange={setSettings} />
        </>
      )}
    </section>
  )
}
