import { registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

export interface SplashElements {
  root: HTMLElement
  /** The logo (LogoMark), with its arches marked `[data-logo-arch="ink"]` and `[data-logo-arch="accent"]`. */
  logo: SVGSVGElement
  /** The ring the impact sends out: hidden until the arches crash, then it spreads and fades. */
  impact: HTMLElement
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
 * Where the splash hands over: `true` to the app (signed in), `false` to the
 * landing page, `null` while that isn't known yet.
 */
export type SplashDestination = () => boolean | null

/**
 * Intro: the logo's two arches fly in from either side, speeding up, and
 * crash into their interlocking place. The impact squashes the logo, shakes
 * it and sends out a ring; the tagline follows. Then, for the landing page,
 * the hero's court-green panel wipes down over it on a wave; the page is
 * already in place underneath, so fading the splash out leaves the hero
 * exactly where the curtain was. Bound for the app, there's no wipe:
 * `onToApp` hands the screen to SplashHandoff, which stays while the app
 * loads and then turns to its colours. While the destination isn't known
 * yet, the logo holds until `decide()` is called.
 */
export function splashTimeline({ root, logo, impact, tagline, curtain }: SplashElements, onHandOver: () => void, onDone: () => void, toApp: SplashDestination, onToApp: () => void) {
  const gsap = registerGsap()
  const cfg = motion.gsap.splash
  const ink = logo.querySelector('[data-logo-arch="ink"]')
  const accent = logo.querySelector('[data-logo-arch="accent"]')
  const wipe = { p: 0 }
  const clip = () => (curtain.style.clipPath = wavePath(curtain.offsetWidth, curtain.offsetHeight, wipe.p))
  clip()

  const tl = gsap.timeline({ onComplete: onDone })
  // The approach: each arch from its own side, tilted away, accelerating into the other.
  tl.fromTo(ink, { x: -cfg.distance, rotation: -16, svgOrigin: '196 350', autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: cfg.approach, ease: 'power4.in' })
  tl.fromTo(accent, { x: cfg.distance, rotation: 16, svgOrigin: '316 350', autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: cfg.approach, ease: 'power4.in' }, '<')
  tl.addLabel('crash')
  // The impact: squashed flat, then springing back while it shakes.
  tl.fromTo(logo, { scaleX: 1 + cfg.squash, scaleY: 1 - cfg.squash, transformOrigin: '50% 100%' }, { scaleX: 1, scaleY: 1, duration: cfg.impact * 2, ease: 'elastic.out(1, 0.35)' }, 'crash')
  // The impact, only at the crash (`immediateRender: false` keeps every part hidden, as the CSS starts them, while
  // the arches fly in): a flash of the accent behind the logo, a thick ring bursting out and thinning as it goes,
  // and a fainter echo ring just behind it.
  const [flash, ring, echo] = [...impact.children] as HTMLElement[]
  const { ring: r } = cfg
  tl.set(impact, { autoAlpha: 1 }, 'crash')
  tl.fromTo(flash, { scale: 0.2, autoAlpha: r.flashOpacity }, { scale: r.flashScale, autoAlpha: 0, duration: r.duration * 0.7, ease: 'expo.out', immediateRender: false }, 'crash')
  tl.fromTo(ring, { scale: 0.25, autoAlpha: 1, borderWidth: r.thickness }, { scale: r.scale, autoAlpha: 0, borderWidth: 1, duration: r.duration, ease: 'expo.out', immediateRender: false }, 'crash')
  tl.fromTo(echo, { scale: 0.25, autoAlpha: 0.7, borderWidth: r.thickness / 2 }, { scale: r.echoScale, autoAlpha: 0, borderWidth: 1, duration: r.duration, ease: 'expo.out', immediateRender: false }, `crash+=${r.echoDelay}`)
  tl.to(logo, { keyframes: { x: [cfg.shake, -cfg.shake * 0.8, cfg.shake * 0.5, -cfg.shake * 0.3, 0] }, duration: cfg.impact, ease: 'none' }, 'crash')
  tl.fromTo(tagline, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, `crash+=${cfg.impact * 0.5}`)

  // Off to the app: no wipe over the landing page. The tagline shows (a skip may come before it has),
  // and SplashHandoff takes over from this frame while the app loads.
  let left = false
  const toTheApp = () => {
    if (left) return
    left = true
    tl.pause()
    gsap.set(logo, { clearProps: 'transform' })
    gsap.set(tagline, { autoAlpha: 1, y: 0 })
    onToApp()
  }
  let waiting = false
  // Just before the wipe: the app, the landing page, or hold on the logo until it's known.
  tl.call(
    () => {
      const destination = toApp()
      if (destination === null) {
        tl.pause()
        waiting = true
      } else if (destination) toTheApp()
    },
    undefined,
    `+=${cfg.hold}`,
  )
  tl.to(wipe, { p: 1, duration: cfg.wipe, ease: 'power3.inOut', onUpdate: clip })
  // Fades as the curtain passes over it (theme colours are oklch, which GSAP can't tween).
  tl.to([logo, tagline], { scale: 0.94, autoAlpha: 0, duration: cfg.wipe * 0.6, ease: 'power2.in' }, '<0.35')
  // The curtain now matches the hero panel: let the hero start its entrance while the splash fades.
  tl.call(onHandOver)
  tl.to(root, { autoAlpha: 0, duration: 0.45, ease: 'power1.out' })
  return {
    kill: () => tl.kill(),
    /** The destination became known: carry on if the logo was holding for it. */
    decide: () => {
      if (!waiting) return
      waiting = false
      if (toApp()) toTheApp()
      else tl.play()
    },
    /** Skipping (a key or a click): straight to the app when it's bound there, otherwise to the end. */
    skip: () => (toApp() ? toTheApp() : ((waiting = false), tl.progress(1))),
  }
}
