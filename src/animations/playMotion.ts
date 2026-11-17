import { Flip, registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/**
 * Playing now's entrance, once it has loaded: its cards rise in order
 * ([data-play-reveal]), their rows after them ([data-play-row]), and the
 * figures count up from zero ([data-count]), like the leaderboard's.
 */
export function playEntrance(root: HTMLElement) {
  const gsap = registerGsap()
  const { duration, ease, distance } = motion.gsap.reveal
  const cfg = motion.gsap.play
  const q = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel))
  const counters = q('[data-count]')
  const tl = gsap.timeline()
  tl.from(q('[data-play-reveal]'), { autoAlpha: 0, y: distance, duration, ease, stagger: cfg.stagger * 2 }, 0)
  tl.from(q('[data-play-row]'), { autoAlpha: 0, y: distance / 2, duration, ease, stagger: cfg.stagger }, 0.2)
  for (const el of counters) {
    const target = Number(el.dataset.count ?? 0)
    const value = { n: 0 }
    tl.to(value, { n: target, duration: cfg.count, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(value.n))) }, 0.25)
  }
  return () => {
    tl.kill()
    for (const el of counters) el.textContent = el.dataset.count ?? el.textContent
    gsap.set([...q('[data-play-reveal]'), ...q('[data-play-row]')], { clearProps: 'opacity,visibility,transform' })
  }
}

/**
 * "You are now playing": the title pops in, the viewer's side slides in from
 * the left and their opponents' from the right until they meet, then "vs"
 * lands between them. Elements: [data-np-title], [data-np-side="mine"|"them"], [data-np-vs], [data-np-rest].
 */
export function nowPlayingEntrance(root: HTMLElement) {
  const gsap = registerGsap()
  const cfg = motion.gsap.play
  const q = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel))
  const tl = gsap.timeline()
  tl.from(q('[data-np-title]'), { autoAlpha: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.8)' }, 0)
  tl.from(q('[data-np-side="mine"]'), { autoAlpha: 0, x: -cfg.sideDistance, duration: cfg.meet, ease: 'power3.out' }, 0.15)
  tl.from(q('[data-np-side="them"]'), { autoAlpha: 0, x: cfg.sideDistance, duration: cfg.meet, ease: 'power3.out' }, 0.15)
  tl.from(q('[data-np-vs]'), { autoAlpha: 0, scale: 2, duration: 0.4, ease: 'back.out(2.5)' }, 0.15 + cfg.meet * 0.7)
  tl.from(q('[data-np-rest]'), { autoAlpha: 0, y: 12, duration: 0.5, ease: 'power2.out', stagger: cfg.stagger }, 0.3)
  return () => {
    tl.kill()
    gsap.set(q('[data-np-title], [data-np-side], [data-np-vs], [data-np-rest]'), { clearProps: 'opacity,visibility,transform' })
  }
}

/** Where every row of a list is now ([data-flip-id]), so a re-order on the next refresh can slide from here. */
export function captureRows(root: HTMLElement) {
  registerGsap()
  return Flip.getState(root.querySelectorAll<HTMLElement>('[data-flip-id]'))
}

/**
 * Slides each row from where it was to its new place after a refresh (the
 * queue's call order), as the leaderboard's rows do. Rows that moved up the
 * order (`before`: the ids in their old order) are highlighted as they pass,
 * and new rows fade in. `onDone` runs once they've settled.
 */
export function animateRows(root: HTMLElement, from: ReturnType<typeof captureRows>, before: string[], onDone: () => void) {
  const gsap = registerGsap()
  const cfg = motion.gsap.play
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-flip-id]'))
  const rising = rows.filter((el, i) => {
    const was = before.indexOf(el.dataset.flipId!)
    return was > i
  })
  rising.forEach((el) => el.classList.add('rank-rising'))
  return Flip.from(from, {
    targets: rows,
    duration: cfg.flip,
    ease: cfg.flipEase,
    onEnter: (entering) => gsap.fromTo(entering, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: cfg.flip }),
    onComplete: () => {
      rising.forEach((el) => el.classList.remove('rank-rising'))
      onDone()
    },
  })
}

/**
 * One status card handing over to the next (on court ↔ waiting): the old one
 * lifts away and fades, the new one rises in, and the box's height moves from
 * the old card's to the new one's so what's below glides instead of jumping.
 */
export function swapStatus(box: HTMLElement, from: HTMLElement, to: HTMLElement, onDone: () => void) {
  const gsap = registerGsap()
  const cfg = motion.gsap.play
  const { duration, ease, distance } = motion.gsap.reveal
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(box, { clearProps: 'height,overflow' })
      onDone()
    },
  })
  tl.fromTo(box, { height: from.offsetHeight, overflow: 'hidden' }, { height: to.offsetHeight, duration: cfg.meet, ease: 'power3.inOut' }, 0)
  tl.to(from, { autoAlpha: 0, y: -distance, scale: 0.97, duration: cfg.meet * 0.6, ease: 'power2.in' }, 0)
  tl.fromTo(to, { autoAlpha: 0, y: distance, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration, ease, clearProps: 'opacity,visibility,transform' }, cfg.meet * 0.35)
  return tl
}
