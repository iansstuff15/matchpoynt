import { useLayoutEffect, useRef, type RefObject } from 'react'
import { animateRows, captureRows } from '@/animations/playMotion'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

/**
 * Animates a live list's re-orders: after a render where its rows'
 * ([data-flip-id]) order changed, they slide from where they were to where
 * they are (Playing now's queue as it refreshes). Positions are taken when
 * the rows are at rest, never mid-slide. Skipped under reduced motion.
 */
export function useLiveRows<T extends HTMLElement>(ref: RefObject<T | null>, ids: string[]) {
  const order = ids.join('\u0000')
  const rest = useRef<ReturnType<typeof captureRows> | null>(null)
  const lastIds = useRef(ids)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || prefersReducedMotion()) return
    const settle = () => {
      rest.current = captureRows(root)
    }
    const before = lastIds.current
    lastIds.current = order.split('\u0000')
    if (!rest.current || before.join('\u0000') === order) {
      settle()
      return
    }
    const tween = animateRows(root, rest.current, before, settle)
    return () => {
      tween.progress(1)
    }
  }, [ref, order])
}
