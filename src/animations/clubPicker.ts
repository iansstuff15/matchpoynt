import { registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

/**
 * The club picker's entrance (and the start page's): the title
 * (`[data-picker-title]`) fades in rising from a little below, the tiles
 * (`[data-picker-tile]`) scale in one after another, then the Find clubs
 * sheet (`[data-picker-sheet]`) rises in like the title. Returns its cleanup.
 */
export function clubPickerEntrance(root: HTMLElement) {
  const gsap = registerGsap()
  const { duration, rise, stagger, ease, tileScale } = motion.gsap.picker
  const from = { autoAlpha: 0, duration, ease }
  const tl = gsap.timeline()
  tl.from(root.querySelectorAll('[data-picker-title]'), { ...from, y: rise })
  // The club tiles scale in, one after another.
  tl.from(root.querySelectorAll('[data-picker-tile]'), { ...from, scale: tileScale, stagger }, `-=${duration * 0.6}`)
  tl.from(root.querySelectorAll('[data-picker-sheet]'), { ...from, y: rise }, `-=${duration * 0.5}`)
  return () => tl.kill()
}

/**
 * Picking a tile: everything on the screen fades out, then the promise
 * resolves (and the app opens). At once under reduced motion.
 */
export function pickTile(root: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve()
  const gsap = registerGsap()
  const { pick } = motion.gsap.picker
  return new Promise((resolve) => {
    gsap.to(root.querySelectorAll('[data-picker-title], [data-picker-tile], [data-picker-sheet]'), { autoAlpha: 0, duration: pick, ease: 'power1.in', onComplete: resolve })
  })
}
