import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import LogoMark from '@/components/brand/LogoMark'
import SplashLoadingBar from '@/components/splash/SplashLoadingBar'
import { motion } from '@/config/motion'
import { site } from '@/config/site'
import { waitForAppReady, waitForStableTheme } from '@/utils/motion/appReady'
import { isHandingOff, setHandingOff, subscribeHandoff } from '@/utils/motion/splashHandoff'

/** A theme colour as the browser has it right now (so a change of theme later can be transitioned from it). */
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()

type Stage = 'waiting' | 'arriving' | 'holding' | 'leaving'

/**
 * Takes over from the splash when it goes straight to the app: the same
 * logo and tagline on the same background, so nothing jumps. It stays while
 * the app loads underneath (its page and the club's colours), then its
 * background and logo turn to the app's (the sidebar frame, its text, the
 * club's accent) once they've stopped changing, the loading bar fills, and when
 * that colour change has finished it holds in them for a moment
 * (`holdMs`) with the logo's arches bobbing before it fades away, leaving the loaded app. The colours
 * change by CSS transition: theme colours are oklch, which GSAP can't tween.
 */
export default function SplashHandoff() {
  const active = useSyncExternalStore(subscribeHandoff, isHandingOff, () => false)
  if (!active) return null
  return createPortal(<Overlay />, document.body)
}

function Overlay() {
  const ref = useRef<HTMLDivElement>(null)
  // The splash's colours as they are now; changed to the app's once it has loaded.
  const [colours, setColours] = useState(() => ({ background: token('background'), ink: token('logo-ink'), accent: token('logo-accent') }))
  const [stage, setStage] = useState<Stage>('waiting')
  const { colourMs, holdMs, fadeMs } = motion.handoff

  useEffect(() => {
    let cancelled = false
    void waitForAppReady(() => ref.current)
      .then(() => waitForStableTheme(['sidebar', 'sidebar-accent-foreground', 'logo-accent']))
      .then(() => {
        if (cancelled) return
        // The app is in place, its club's colours applied: turn to them.
        setColours({ background: token('sidebar'), ink: token('sidebar-accent-foreground'), accent: token('logo-accent') })
        setStage('arriving')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (stage === 'arriving') {
      // Hold only once the colours have finished changing: the background's transition ending (or its time, if no transition runs).
      const overlay = ref.current
      const done = () => setStage((s) => (s === 'arriving' ? 'holding' : s))
      const onEnd = (event: TransitionEvent) => event.target === overlay && event.propertyName === 'background-color' && done()
      overlay?.addEventListener('transitionend', onEnd)
      const timer = window.setTimeout(done, colourMs + 100)
      return () => {
        overlay?.removeEventListener('transitionend', onEnd)
        window.clearTimeout(timer)
      }
    }
    if (stage === 'holding') {
      const timer = window.setTimeout(() => setStage('leaving'), holdMs)
      return () => window.clearTimeout(timer)
    }
    if (stage === 'leaving') {
      const timer = window.setTimeout(() => setHandingOff(false), fadeMs)
      return () => window.clearTimeout(timer)
    }
  }, [stage, colourMs, holdMs, fadeMs])

  return (
    <div
      ref={ref}
      className="splash-root splash-handoff"
      role="status"
      aria-label="Opening the app"
      data-stage={stage}
      style={{
        backgroundColor: colours.background,
        color: colours.ink,
        ['--logo-accent' as string]: colours.accent,
        ['--handoff-colour-ms' as string]: `${colourMs}ms`,
        ['--handoff-fade-ms' as string]: `${fadeMs}ms`,
      }}
    >
      <div className="splash-stack">
        <div className="relative grid place-items-center">
          <LogoMark className="splash-logo splash-handoff-logo" />
        </div>
        <p className="splash-tagline splash-handoff-tagline">{site.tagline}</p>
        <SplashLoadingBar done={stage !== 'waiting'} />
      </div>
    </div>
  )
}
