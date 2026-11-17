import { useEffect, useState } from 'react'
import { Navigate, Outlet, useMatch, useNavigate, useParams, useSearchParams } from 'react-router'
import ClubLoadingScreen from '@/components/club/ClubLoadingScreen'
import ClubPageHeader from '@/components/club/ClubPageHeader'
import ClubHandleRequiredDialog from '@/components/club/ClubHandleRequiredDialog'
import ClubSettingsDialog from '@/components/club/settings/ClubSettingsDialog'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { clubPages } from '@/config/club'
import type { ClubPage, ClubSettingsGroup } from '@/types/club'
import type { ClubPageContext } from '@/utils/hooks/useClubPage'
import { useClubPreview } from '@/utils/hooks/useClubPreview'
import { useClub, useClubActions } from '@/utils/hooks/useClubs'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'
import { remember } from '@/utils/platform/remember'

/**
 * Every page of one club (`/clubs/<id>` and `/clubs/<id>/<page>`): loads the
 * club once, remembers it as the one opened last, holds its actions and
 * settings dialog, and hands them to the page. The dashboard draws its own
 * hero; the other pages get a compact header.
 */
export default function ClubLayout() {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const onDashboard = Boolean(useMatch('/clubs/:clubId'))
  const club = useClub(clubId)
  const preview = useClubPreview({ id: clubId })
  const [settings, setSettings] = useState<ClubSettingsGroup | null>(null)
  useEffect(() => {
    if (club.isSuccess) remember('club', clubId)
  }, [club.isSuccess, clubId])
  // A started plan is the running session: the board takes over.
  const actions = useClubActions(clubId, (session) => navigate(`/app/${session.id}`))

  // Links from before the club's tabs became pages (`?tab=members`) still land on the page.
  const legacyTab = params.get('tab')
  if (onDashboard && legacyTab) {
    const page = clubPages.find((p) => p === legacyTab) as ClubPage | undefined
    return <Navigate to={page ? clubPageHref(clubId, page) : clubPageHref(clubId)} replace />
  }
  // Deleted: back to the list.
  if (actions.deleteClub.isSuccess) return <Navigate to="/clubs" replace />

  if (club.isPending) {
    return (
      <section aria-busy="true" aria-label="Loading the club" className="app-page">
        <ClubLoadingScreen preview={preview} />
      </section>
    )
  }
  if (club.isError) {
    return (
      <section aria-labelledby="club-title" className="app-page">
        <h1 id="club-title" className="sr-only">
          Club
        </h1>
        <ErrorBanner error={club.error} action="load the club" onRetry={() => void club.refetch()} />
      </section>
    )
  }

  const context: ClubPageContext = { view: club.data, actions, openSettings: (group = 'general') => setSettings(group) }
  return (
    <section aria-labelledby="club-title" className="app-page">
      {!onDashboard && <ClubPageHeader club={club.data.club} onSettings={() => setSettings('general')} />}
      {actions.failure && <ErrorBanner error={actions.failure.error} action={actions.failure.action} onRetry={actions.failure.retry} onDismiss={actions.clearFailure} />}
      <Outlet context={context} />
      <ClubSettingsDialog club={club.data.club} actions={actions} group={settings} onGroupChange={setSettings} />
      {/* A club without an @handle can't be used until it has one. */}
      {!club.data.club.handle && <ClubHandleRequiredDialog club={club.data.club} actions={actions} />}
    </section>
  )
}
