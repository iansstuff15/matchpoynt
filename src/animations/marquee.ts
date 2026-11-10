import { registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/**
 * Endless sideways scroll: `track` holds the items twice, so sliding it by
 * half its width loops seamlessly. Slows to a stop while hovered or focused.
 */
export function marquee(root: HTMLElement, track: HTMLElement) {
  const gsap = registerGsap()
  const tween = gsap.to(track, { xPercent: -50, duration: motion.gsap.marquee.duration, ease: 'none', repeat: -1 })
  const slow = () => gsap.to(tween, { timeScale: 0, duration: 0.6, overwrite: true })
  const resume = () => gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true })
  root.addEventListener('pointerenter', slow)
  root.addEventListener('pointerleave', resume)
  root.addEventListener('focusin', slow)
  root.addEventListener('focusout', resume)
  return () => {
    root.removeEventListener('pointerenter', slow)
    root.removeEventListener('pointerleave', resume)
    root.removeEventListener('focusin', slow)
    root.removeEventListener('focusout', resume)
    tween.kill()
  }
}
