import { registerGsap, SplitText } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/**
 * Splits a heading into letters that rise into place on a sine wave as its
 * section comes into view, and settle back if you scroll up past it.
 */
export function waveHeading(heading: HTMLElement) {
  const gsap = registerGsap()
  const { duration, ease, stagger, lift, tilt, frequency, start } = motion.gsap.wave
  const split = SplitText.create(heading, { type: 'words,chars', aria: 'auto' })
  const tween = gsap.from(split.chars, {
    y: (i: number) => lift * (0.6 + 0.4 * Math.sin(i * frequency)),
    rotation: (i: number) => tilt * Math.sin(i * frequency + 1),
    autoAlpha: 0,
    duration,
    ease,
    stagger,
    scrollTrigger: { trigger: heading.closest('section') ?? heading, start, toggleActions: 'play none none reverse' },
  })
  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
    split.revert()
  }
}
