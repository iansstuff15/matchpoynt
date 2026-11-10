import { registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

export interface SplashElements {
  root: HTMLElement
  word: HTMLElement
  tagline: HTMLElement
  curtain: HTMLElement
}

/** Clip path for the curtain: everything above a wavy edge that sits `progress` of the way down. */
function wavePath(w: number, h: number, progress: number) {
  const amp = motion.gsap.splash.waveAmplitude * Math.sin(Math.PI * Math.min(progress, 1))
  const y = progress * (h + amp * 2) - amp
  return `path('M0 0 H${w} V${y + amp} C${w * 0.68} ${y + amp}, ${w * 0.36} ${y - amp}, 0 ${y - amp * 0.4} Z')`
}

/**
 * Intro: the oversized wordmark rises into view, the tagline follows, then
 * the hero's court-green panel wipes down over it on a wave. The page is
 * already in place underneath, so fading the splash out leaves the hero
 * exactly where the curtain was.
 */
export function splashTimeline({ root, word, tagline, curtain }: SplashElements, onHandOver: () => void, onDone: () => void) {
  const gsap = registerGsap()
  const cfg = motion.gsap.splash
  const wipe = { p: 0 }
  const clip = () => (curtain.style.clipPath = wavePath(curtain.offsetWidth, curtain.offsetHeight, wipe.p))
  clip()

  const tl = gsap.timeline({ onComplete: onDone })
  tl.fromTo(
    word,
    { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 18, letterSpacing: '0.02em' },
    { clipPath: 'inset(-20% -5% -20% -5%)', yPercent: 0, letterSpacing: '-0.05em', duration: cfg.reveal, ease: 'expo.out' },
  )
  tl.fromTo(tagline, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.6')
  tl.to(wipe, { p: 1, duration: cfg.wipe, ease: 'power3.inOut', onUpdate: clip }, `+=${cfg.hold}`)
  // Fades as the curtain passes over it (theme colours are oklch, which GSAP can't tween).
  tl.to([word, tagline], { scale: 0.94, autoAlpha: 0, duration: cfg.wipe * 0.6, ease: 'power2.in' }, '<0.35')
  // The curtain now matches the hero panel: let the hero start its entrance while the splash fades.
  tl.call(onHandOver)
  tl.to(root, { autoAlpha: 0, duration: 0.45, ease: 'power1.out' })
  return tl
}
