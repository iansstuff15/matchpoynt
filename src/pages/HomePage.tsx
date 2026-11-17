import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import PageMeta from '@/components/seo/PageMeta'
import Splash from '@/components/splash/Splash'
import DesktopSection from '@/components/sections/home/DesktopSection'
import FeaturesSection from '@/components/sections/home/FeaturesSection'
import HeroSection from '@/components/sections/home/HeroSection'
import SignInSection from '@/components/sections/home/SignInSection'
import SportsSection from '@/components/sections/home/SportsSection'
import { site } from '@/config/site'
import { useAppHome } from '@/utils/hooks/useCanRunSessions'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'
import { afterSplash } from '@/utils/motion/splashEvents'
import { writeSessionFlag } from '@/utils/motion/sessionFlag'

/**
 * The landing page. Someone already signed in (a sign-in the API has just
 * confirmed, not one remembered on this device) goes straight to their home
 * in the app (the board at /app, or Playing now for players): after the splash, if it's playing, instead of the page under it.
 */
export default function HomePage() {
  const { web } = useFeatures()
  const me = useMe()
  const home = useAppHome()
  // Checked again on this visit, so an expired sign-in remembered on the device doesn't send anyone to the app.
  const signedIn = web.signIn && me.isFetchedAfterMount && me.isSuccess && Boolean(me.data.user)
  // Where the splash hands over: the app, the landing page, or not known while the check is out.
  const toApp = !web.signIn || me.isError ? false : me.isFetchedAfterMount ? signedIn : null
  const [splashOver, setSplashOver] = useState(false)
  // The splash marks itself as playing before this runs (its layout effect), so this waits for its hand-over.
  // Once it has handed over it counts as seen for this browser session, even if the app takes over before it fades.
  useEffect(
    () =>
      afterSplash(() => {
        writeSessionFlag(site.sessionKeys.splashSeen)
        setSplashOver(true)
      }),
    [],
  )

  if (signedIn && splashOver) return <Navigate to={home} replace />
  return (
    <>
      <PageMeta />
      <Splash toApp={toApp} />
      <HeroSection />
      <FeaturesSection />
      <SportsSection />
      <DesktopSection />
      <SignInSection />
    </>
  )
}
