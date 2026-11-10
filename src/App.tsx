import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router'
import RequireCompleteProfile from '@/components/auth/RequireCompleteProfile'
import RequireSignIn from '@/components/auth/RequireSignIn'
import AppLoading from '@/components/common/AppLoading'
import AppLayout from '@/components/layout/app/AppLayout'
import SiteLayout from '@/components/layout/site/SiteLayout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import CheckInPage from '@/pages/CheckInPage'
import ClubManagerPage from '@/pages/ClubManagerPage'
import ClubsPage from '@/pages/ClubsPage'
import CompleteProfilePage from '@/pages/CompleteProfilePage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import HomePage from '@/pages/HomePage'
import InvitePage from '@/pages/InvitePage'
import NotFoundPage from '@/pages/NotFoundPage'
import PastSessionsPage from '@/pages/PastSessionsPage'
import PublicLeaderboardPage from '@/pages/PublicLeaderboardPage'
import PublicTournamentPage from '@/pages/PublicTournamentPage'
import RankingsPage from '@/pages/RankingsPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import SessionPage from '@/pages/SessionPage'
import SetPasswordPage from '@/pages/SetPasswordPage'
import SignInPage from '@/pages/SignInPage'
import SignUpPage from '@/pages/SignUpPage'
import { queryClient } from '@/utils/api/queryClient'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'
import { isDesktop } from '@/utils/platform'

/** Desktop: the Queue Master shell only. Hash routing survives reloads from the bundled assets. */
function DesktopRoutes() {
  const { web } = useFeatures()
  return (
    <HashRouter>
      <Routes>
        <Route
          element={
            <RequireCompleteProfile>
              <AppLayout />
            </RequireCompleteProfile>
          }
        >
          <Route path="/app" element={<SessionPage />} />
          <Route path="/app/past" element={<PastSessionsPage />} />
          <Route path="/app/:sessionId" element={<SessionPage />} />
          {web.clubs && <Route path="/clubs" element={<ClubsPage />} />}
          {web.clubs && <Route path="/clubs/:clubId" element={<ClubManagerPage />} />}
          {web.rankings && <Route path="/rankings" element={<RankingsPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
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
        {/* Auth pages have their own full-bleed photo layout. */}
        {web.signIn && <Route path="/sign-in" element={<SignInPage />} />}
        {web.signIn && web.signUp && <Route path="/sign-up" element={<SignUpPage />} />}
        {web.signIn && <Route path="/complete-profile" element={<CompleteProfilePage />} />}
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
        {web.signIn && web.passwordReset && <Route path="/forgot-password" element={<ForgotPasswordPage />} />}
        {web.signIn && web.passwordReset && <Route path="/reset-password" element={<ResetPasswordPage />} />}
        {web.signIn && web.signInEmail && <Route path="/account/password" element={<SetPasswordPage />} />}
        <Route
          element={
            <RequireSignIn>
              <RequireCompleteProfile>
                <AppLayout />
              </RequireCompleteProfile>
            </RequireSignIn>
          }
        >
          <Route path="/app" element={<SessionPage />} />
          <Route path="/app/past" element={<PastSessionsPage />} />
          <Route path="/app/:sessionId" element={<SessionPage />} />
          {web.clubs && <Route path="/clubs" element={<ClubsPage />} />}
          {web.clubs && <Route path="/clubs/:clubId" element={<ClubManagerPage />} />}
        </Route>
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Routing />
        <Toaster position="bottom-right" closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
