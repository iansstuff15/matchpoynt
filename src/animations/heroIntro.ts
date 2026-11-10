import { registerGsap, SplitText } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/** Hero entrance once the splash hands over: the headline rides in on a wave, then the rest rises. */
export function heroIntro(title: HTMLElement, items: HTMLElement[]) {
  const gsap = registerGsap()
  const { lift, tilt, frequency, stagger, ease } = motion.gsap.wave
  const { distance, duration, ease: revealEase } = motion.gsap.reveal
  // aria 'auto' keeps the headline readable as one phrase for screen readers.
  const split = SplitText.create(title, { type: 'words,chars', aria: 'auto' })
  const tl = gsap.timeline()
  // The title may have been hidden while the splash played; its letters take over from here.
  tl.set(title, { autoAlpha: 1 })
  tl.from(split.chars, {
    y: (i: number) => lift * 1.4 * (0.6 + 0.4 * Math.sin(i * frequency)),
    rotation: (i: number) => tilt * Math.sin(i * frequency + 1),
    autoAlpha: 0,
    duration: 1.1,
    ease,
    stagger,
  })
  tl.fromTo(items, { autoAlpha: 0, y: distance }, { autoAlpha: 1, y: 0, duration, ease: revealEase, stagger: 0.08 }, '-=0.6')
  return () => {
    tl.kill()
    split.revert()
    gsap.set([title, ...items], { clearProps: 'opacity,visibility,transform' })
  }
}
