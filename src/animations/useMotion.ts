import { useGSAP } from '@gsap/react'
import type { RefObject } from 'react'
import { registerGsap } from '@/animations/registerGsap'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

registerGsap()

/**
 * Runs a GSAP animation function on an element once it mounts, and its
 * cleanup on unmount. Skipped entirely when the system asks for reduced
 * motion, so the content simply shows in place.
 */
export function useMotion<T extends HTMLElement>(ref: RefObject<T | null>, animate: (el: T) => (() => void) | void) {
  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion()) return
      return animate(el) ?? undefined
    },
    { scope: ref },
  )
}
