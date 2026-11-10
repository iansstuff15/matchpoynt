import { useGSAP } from '@gsap/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { splashTimeline } from '@/animations/splashTimeline'
import { site } from '@/config/site'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'
import { readSessionFlag, writeSessionFlag } from '@/utils/motion/sessionFlag'
import { setSplashActive } from '@/utils/motion/splashEvents'

/**
 * Intro, once per browser session: an oversized "Matchpoynt" rises into view,
 * then the hero's court-green panel wipes down on a wave and hands over to the
 * page. Click or press any key to skip. Off with FEATURE_WEB_SPLASH=false or
 * reduced motion.
 */
export default function Splash() {
  const { web } = useFeatures()
  const [visible, setVisible] = useState(() => web.splash && !prefersReducedMotion() && !readSessionFlag(site.sessionKeys.splashSeen))
  const rootRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLParagraphElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<ReturnType<typeof splashTimeline> | null>(null)

  const handOver = useCallback(() => setSplashActive(false), [])
  const finish = useCallback(() => {
    writeSessionFlag(site.sessionKeys.splashSeen)
    setSplashActive(false)
    setVisible(false)
  }, [])

  // Before the hero's effects run, so it knows to wait for the hand-over.
  useLayoutEffect(() => {
    if (visible) setSplashActive(true)
  }, [visible])

  useGSAP(
    () => {
      const [root, word, tagline, curtain] = [rootRef.current, wordRef.current, taglineRef.current, curtainRef.current]
      if (!visible || !root || !word || !tagline || !curtain) return
      let cancelled = false
      // Measure the wordmark in its real font before animating it.
      void document.fonts.ready.then(() => {
        if (!cancelled) tlRef.current = splashTimeline({ root, word, tagline, curtain }, handOver, finish)
      })
      return () => {
        cancelled = true
        tlRef.current?.kill()
      }
    },
    { dependencies: [visible], scope: rootRef },
  )

  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = 'hidden'
    const skip = () => (tlRef.current ? tlRef.current.progress(1) : finish())
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
      onClick={() => (tlRef.current ? tlRef.current.progress(1) : finish())}
    >
      <div ref={curtainRef} aria-hidden="true" className="frame-hero splash-curtain" />
      <div className="splash-stack">
        <p ref={wordRef} className="splash-word" aria-hidden="true">
          {site.name}
        </p>
        <p ref={taglineRef} className="splash-tagline" aria-hidden="true">
          {site.tagline}
        </p>
      </div>
      <p className="eyebrow-mono absolute right-6 bottom-8 text-muted-foreground md:right-12">press any key to skip</p>
    </div>,
    document.body,
  )
}
