import type { ReactNode } from 'react'
import type { Features } from '@matchpoynt/shared'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router'
import RequireClubManager from '@/components/auth/RequireClubManager'
import RequireSessionRunner from '@/components/auth/RequireSessionRunner'
import RequireCompleteProfile from '@/components/auth/RequireCompleteProfile'
import RequireSignIn from '@/components/auth/RequireSignIn'
import AppLoading from '@/components/common/AppLoading'
import AppLayout from '@/components/layout/app/AppLayout'
import SplashHandoff from '@/components/splash/SplashHandoff'
import SiteLayout from '@/components/layout/site/SiteLayout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import CheckInPage from '@/pages/CheckInPage'
import ClubsPage from '@/pages/ClubsPage'
import ClubAccountingPage from '@/pages/club/ClubAccountingPage'
import ClubAnnouncementsPage from '@/pages/club/ClubAnnouncementsPage'
import ClubBadgesPage from '@/pages/club/ClubBadgesPage'
import ClubBillersPage from '@/pages/club/ClubBillersPage'
import ClubDashboardPage from '@/pages/club/ClubDashboardPage'
import ClubFeedbackPage from '@/pages/club/ClubFeedbackPage'
import ClubExpensesPage from '@/pages/club/ClubExpensesPage'
import ClubInvoicesPage from '@/pages/club/ClubInvoicesPage'
import ClubInvoicePage from '@/pages/club/ClubInvoicePage'
import ClubExpensePage from '@/pages/club/ClubExpensePage'
import ClubLayout from '@/pages/club/ClubLayout'
import ClubMembersPage from '@/pages/club/ClubMembersPage'
import ClubSessionsPage from '@/pages/club/ClubSessionsPage'
import CompleteProfilePage from '@/pages/CompleteProfilePage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import HomePage from '@/pages/HomePage'
import InvitePage from '@/pages/InvitePage'
import ChooseClubPage from '@/pages/ChooseClubPage'
import StartPage from '@/pages/StartPage'
import FriendsPage from '@/pages/FriendsPage'
import PlayPage from '@/pages/PlayPage'
import PlayerSessionPage from '@/pages/PlayerSessionPage'
import JoinClubPage from '@/pages/JoinClubPage'
import PlayerClubPage from '@/pages/PlayerClubPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PersonProfilePage from '@/pages/PersonProfilePage'
import ProfilePage from '@/pages/ProfilePage'
import RecordBadgesPage from '@/pages/record/RecordBadgesPage'
import RecordGamesPage from '@/pages/record/RecordGamesPage'
import RecordOverviewPage from '@/pages/record/RecordOverviewPage'
import RecordRivalsPage from '@/pages/record/RecordRivalsPage'
import RecordSessionsPage from '@/pages/record/RecordSessionsPage'
import PublicLeaderboardPage from '@/pages/PublicLeaderboardPage'
import PublicTournamentPage from '@/pages/PublicTournamentPage'
import RankingsPage from '@/pages/RankingsPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import SessionPage from '@/pages/SessionPage'
import SetPasswordPage from '@/pages/SetPasswordPage'
import ChangeEmailPage from '@/pages/ChangeEmailPage'
import EmailChangedPage from '@/pages/EmailChangedPage'
import EmailConfirmedPage from '@/pages/EmailConfirmedPage'
import EmailRestoredPage from '@/pages/EmailRestoredPage'
import LinkErrorPage from '@/pages/LinkErrorPage'
import SignInPage from '@/pages/SignInPage'
import SignUpPage from '@/pages/SignUpPage'
import { persistOptions } from '@/utils/api/persistCache'
import { queryClient } from '@/utils/api/queryClient'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'
import { isDesktop } from '@/utils/platform'

/**
 * A club's pages: the dashboard at `/clubs/<id>`, each other page under it.
 * Pages of switched-off features aren't routes at all.
 */
function clubRoutes(web: Features['web']) {
  return (
    <Route
      path="/clubs/:clubId"
      element={
        <RequireClubManager>
          <ClubLayout />
        </RequireClubManager>
      }
    >
      <Route index element={<ClubDashboardPage />} />
      <Route path="sessions" element={<ClubSessionsPage />} />
      <Route path="members" element={<ClubMembersPage />} />
      {web.clubBadges && <Route path="badges" element={<ClubBadgesPage />} />}
      {web.clubFeedback && <Route path="feedback" element={<ClubFeedbackPage />} />}
      {web.clubAnnouncements && <Route path="announcements" element={<ClubAnnouncementsPage />} />}
      {web.accounting && <Route path="invoices" element={<ClubInvoicesPage />} />}
      {web.accounting && <Route path="invoices/:kind/:groupId" element={<ClubInvoicePage />} />}
      {web.accounting && <Route path="expenses" element={<ClubExpensesPage />} />}
      {web.accounting && <Route path="expenses/:expenseId" element={<ClubExpensePage />} />}
      {web.accounting && <Route path="billers" element={<ClubBillersPage />} />}
      {web.accounting && <Route path="accounting" element={<ClubAccountingPage />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
}

/** The auth pages (their own full-bleed photo layout), on the website and on desktop. */
function authRoutes(web: Features['web']) {
  return (
    <>
      {web.signIn && <Route path="/sign-in" element={<SignInPage />} />}
      {web.signIn && web.signUp && <Route path="/sign-up" element={<SignUpPage />} />}
      {web.signIn && <Route path="/complete-profile" element={<CompleteProfilePage />} />}
      {web.signIn && web.passwordReset && <Route path="/forgot-password" element={<ForgotPasswordPage />} />}
      {web.signIn && web.passwordReset && <Route path="/reset-password" element={<ResetPasswordPage />} />}
      {web.signIn && web.signInEmail && <Route path="/account/password" element={<SetPasswordPage />} />}
      {web.signIn && web.signInEmail && <Route path="/account/email" element={<ChangeEmailPage />} />}
      {/* Where emailed links land once the API has used them (/api/auth/action). */}
      {web.signIn && <Route path="/auth/email-confirmed" element={<EmailConfirmedPage />} />}
      {web.signIn && <Route path="/auth/email-changed" element={<EmailChangedPage />} />}
      {web.signIn && <Route path="/auth/email-restored" element={<EmailRestoredPage />} />}
      {web.signIn && <Route path="/auth/link-error" element={<LinkErrorPage />} />}
    </>
  )
}

/** The app shell's pages (`AppLayout`), on the website and on desktop; the start page and club picker are full screen, outside it. */
function appRoutes(web: Features['web']) {
  const directory = web.clubs && web.signIn && web.clubDirectory
  const fullScreen = (page: ReactNode) => (
    <RequireSignIn>
      <RequireCompleteProfile>{page}</RequireCompleteProfile>
    </RequireSignIn>
  )
  return (
    <>
      <Route path="/start" element={fullScreen(<StartPage />)} />
      {directory && <Route path="/choose-club" element={fullScreen(<ChooseClubPage />)} />}
      <Route
        element={
          <RequireSignIn>
            <RequireCompleteProfile>
              <AppLayout />
            </RequireCompleteProfile>
          </RequireSignIn>
        }
      >
        <Route
          path="/app"
          element={
            <RequireSessionRunner>
              <SessionPage />
            </RequireSessionRunner>
          }
        />
        {/* Past sessions are listed on the session board now; old links land there. */}
        <Route path="/app/past" element={<Navigate to="/app" replace />} />
        {web.signIn && <Route path="/profile" element={<ProfilePage />} />}
        {web.signIn && <Route path="/u/:username" element={<PersonProfilePage />} />}
        {web.signIn && <Route path="/record" element={<RecordOverviewPage />} />}
        {web.signIn && <Route path="/record/games" element={<RecordGamesPage />} />}
        {web.signIn && <Route path="/record/sessions" element={<RecordSessionsPage />} />}
        {web.signIn && <Route path="/record/badges" element={<RecordBadgesPage />} />}
        {web.signIn && <Route path="/record/rivals" element={<RecordRivalsPage />} />}
        {/* Session invoices are on each finished session's page now; old links land on the board. */}
        <Route path="/app/invoices" element={<Navigate to="/app" replace />} />
        <Route
          path="/app/:sessionId"
          element={
            <RequireSessionRunner>
              <SessionPage />
            </RequireSessionRunner>
          }
        />
        {web.clubs && (
          <Route
            path="/clubs"
            element={
              <RequireClubManager>
                <ClubsPage />
              </RequireClubManager>
            }
          />
        )}
        {web.clubs && clubRoutes(web)}
        {/* Find clubs is part of the club picker now. */}
        {directory && <Route path="/explore" element={<Navigate to="/choose-club" replace />} />}
        {directory && <Route path="/c/:handle" element={<PlayerClubPage />} />}
        {directory && web.playerView && <Route path="/play" element={<PlayPage />} />}
        {directory && web.playerView && <Route path="/play/:sessionId" element={<PlayerSessionPage />} />}
        {web.signIn && web.friends && <Route path="/friends" element={<FriendsPage />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </>
  )
}

/**
 * Desktop: only the auth pages and the app shell. No landing page, rankings,
 * published links or check-in: `/` and anything unknown open the board.
 * Hash routing survives reloads from the bundled assets.
 */
function DesktopRoutes() {
  const { web } = useFeatures()
  return (
    <HashRouter>
      <Routes>
        {authRoutes(web)}
        {appRoutes(web)}
        <Route index element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  )
}

/** Website: marketing, rankings, sign-in, public leaderboards and check-in in the site shell; the board in the app shell. */
function WebRoutes() {
  const { web } = useFeatures()
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          {web.rankings && <Route path="/rankings" element={<RankingsPage />} />}
          {web.publishSessions && <Route path="/s/:slug" element={<PublicLeaderboardPage />} />}
          {web.tournaments && web.publishTournaments && <Route path="/t/:slug" element={<PublicTournamentPage />} />}
          <Route path="/check-in/:slug" element={<CheckInPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {authRoutes(web)}
        {web.signIn && web.clubs && (
          <Route
            path="/invite/:token"
            element={
              <RequireSignIn>
                <InvitePage />
              </RequireSignIn>
            }
          />
        )}
        {web.signIn && web.clubs && web.clubDirectory && <Route path="/join/:handle" element={<JoinClubPage />} />}
        {appRoutes(web)}
      </Routes>
    </BrowserRouter>
  )
}

/** Routes depend on feature toggles, so nothing renders until the API has said which are on. */
function Routing() {
  const config = useAppConfig()
  // Wait for the first answer only. Later refetches (e.g. after an outage)
  // must not unmount the app, or every remount would refetch again.
  const [ready, setReady] = useState(false)
  if (!ready && !config.isPending) setReady(true)
  if (!ready) return <AppLoading />
  return isDesktop() ? <DesktopRoutes /> : <WebRoutes />
}

export default function App() {
  return (
    // Non-sensitive club and profile details are kept on this device (utils/api/persistCache.ts).
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <TooltipProvider>
        <Routing />
        <SplashHandoff />
        <Toaster position="bottom-right" closeButton />
      </TooltipProvider>
    </PersistQueryClientProvider>
  )
}
