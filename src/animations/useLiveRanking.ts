import { useGSAP } from '@gsap/react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { animateRanking, captureRanking, leaderboardEntrance, type RankingSnapshot } from '@/animations/leaderboardMotion'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

/** Whether the element is on screen and the tab is in front. */
function useWatched(ref: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)), { threshold: 0.15 })
    io.observe(el)
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ref])

  return onScreen && tabVisible
}

/**
 * Returns the leaderboard to display. New rankings are only shown while
 * someone is watching (board on screen, tab in front): then everyone slides
 * to their new place. Changes that arrive unseen wait, and play when the
 * viewer comes back. Also runs the one-time entrance. Reduced motion shows
 * updates at once, without animation.
 */
export function useLiveRanking<T>(rootRef: RefObject<HTMLElement | null>, data: T): T {
  const watched = useWatched(rootRef)
  const [shown, setShown] = useState(data)
  const pending = useRef<RankingSnapshot | null>(null)
  const reduced = prefersReducedMotion()

  // Hold or apply new data. Reading positions here, before React swaps the DOM, is what lets them animate.
  useEffect(() => {
    // Reduced motion bypasses this: the hook returns live data directly.
    if (reduced || data === shown || !watched || !rootRef.current) return
    pending.current = captureRanking(rootRef.current)
    setShown(data)
  }, [data, shown, watched, reduced, rootRef])

  useLayoutEffect(() => {
    const from = pending.current
    pending.current = null
    if (from && rootRef.current) return animateRanking(rootRef.current, from)
  }, [shown, rootRef])

  useGSAP(
    () => {
      if (!rootRef.current || reduced) return
      return leaderboardEntrance(rootRef.current)
    },
    { scope: rootRef },
  )

  return reduced ? data : shown
}
