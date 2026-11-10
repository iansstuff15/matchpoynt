import { registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/** Reveals every [data-reveal] element in a section, in order, as the section enters the viewport. */
export function revealSection(section: HTMLElement) {
  const gsap = registerGsap()
  const items = section.querySelectorAll<HTMLElement>('[data-reveal]')
  if (!items.length) return () => undefined
  const { duration, ease, distance, stagger, start } = motion.gsap.reveal
  const tween = gsap.from(items, {
    autoAlpha: 0,
    y: distance,
    duration,
    ease,
    stagger,
    scrollTrigger: { trigger: section, start, once: true },
  })
  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
    gsap.set(items, { clearProps: 'opacity,visibility,transform' })
  }
}
