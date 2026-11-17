import { useGSAP } from '@gsap/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { splashTimeline } from '@/animations/splashTimeline'
import LogoMark from '@/components/brand/LogoMark'
import SplashLoadingBar from '@/components/splash/SplashLoadingBar'
import { site } from '@/config/site'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'
import { readSessionFlag, writeSessionFlag } from '@/utils/motion/sessionFlag'
import { setSplashActive } from '@/utils/motion/splashEvents'
import { setHandingOff } from '@/utils/motion/splashHandoff'

/**
 * Intro, once per browser session: the logo's two arches fly in from either
 * side and crash together, then the hero's court-green panel wipes down on a
 * wave and hands over to the page. Someone signed in skips the wipe: the logo
 * fades and the app takes over (`toApp`). Click or press any key to skip. Off with FEATURE_WEB_SPLASH=false or
 * reduced motion.
 */
interface SplashProps {
  /** Where it hands over: `true` to the app (signed in), `false` to the landing page, `null` while unknown. */
  toApp: boolean | null
}

export default function Splash({ toApp }: SplashProps) {
  const { web } = useFeatures()
  // Read by the timeline when it reaches the wipe, so it always sees the latest answer.
  const toAppRef = useRef(toApp)
  const [visible, setVisible] = useState(() => web.splash && !prefersReducedMotion() && !readSessionFlag(site.sessionKeys.splashSeen))
  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<SVGSVGElement>(null)
  const impactRef = useRef<HTMLSpanElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<ReturnType<typeof splashTimeline> | null>(null)

  const handOver = useCallback(() => setSplashActive(false), [])
  const finish = useCallback(() => {
    writeSessionFlag(site.sessionKeys.splashSeen)
    setSplashActive(false)
    setVisible(false)
  }, [])
  // Bound for the app: SplashHandoff covers the screen first (the same frame), then the splash goes and the app loads under it.
  const handToApp = useCallback(() => {
    setHandingOff(true)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        handOver()
        finish()
      }),
    )
  }, [handOver, finish])

  // Before the hero's effects run, so it knows to wait for the hand-over.
  useLayoutEffect(() => {
    if (visible) setSplashActive(true)
  }, [visible])

  useGSAP(
    () => {
      const [root, logo, impact, tagline, curtain] = [rootRef.current, logoRef.current, impactRef.current, taglineRef.current, curtainRef.current]
      if (!visible || !root || !logo || !impact || !tagline || !curtain) return
      let cancelled = false
      // The tagline is measured in its real font before animating.
      void document.fonts.ready.then(() => {
        if (!cancelled) tlRef.current = splashTimeline({ root, logo, impact, tagline, curtain }, handOver, finish, () => toAppRef.current, handToApp)
      })
      return () => {
        cancelled = true
        tlRef.current?.kill()
      }
    },
    { dependencies: [visible], scope: rootRef },
  )

  // Once the sign-in check answers, a logo holding for it carries on.
  useEffect(() => {
    toAppRef.current = toApp
    tlRef.current?.decide()
  }, [toApp])

  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = 'hidden'
    const skip = () => (tlRef.current ? tlRef.current.skip() : finish())
    window.addEventListener('keydown', skip)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', skip)
    }
  }, [visible, finish])

  if (!visible) return null

  return createPortal(
    <div
      ref={rootRef}
      className="splash-root"
      role="dialog"
      aria-modal="true"
      aria-label="Intro animation. Press any key or click to skip."
      onClick={() => (tlRef.current ? tlRef.current.skip() : finish())}
    >
      <div ref={curtainRef} aria-hidden="true" className="frame-hero splash-curtain" />
      <div className="splash-stack">
        <div className="relative grid place-items-center">
          <span ref={impactRef} className="splash-impact" aria-hidden="true">
            <span className="splash-impact-flash" />
            <span className="splash-impact-ring" />
            <span className="splash-impact-ring" />
          </span>
          <LogoMark ref={logoRef} className="splash-logo" />
        </div>
        <p ref={taglineRef} className="splash-tagline" aria-hidden="true">
          {site.tagline}
        </p>
        <SplashLoadingBar />
      </div>
      <p className="eyebrow-mono absolute right-6 bottom-8 text-muted-foreground md:right-12">press any key to skip</p>
    </div>,
    document.body,
  )
}
