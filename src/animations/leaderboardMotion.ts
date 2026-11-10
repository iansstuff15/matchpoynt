import { Flip, registerGsap } from '@/animations/registerGsap'
import { motion } from '@/config/motion'

/**
 * Entrance, once, when the leaderboard scrolls into view: podium bars grow
 * from the floor, the cards and rows rise in, and podium numbers count up.
 * Elements: [data-podium-bar], [data-podium-card], [data-board-row], [data-count].
 */
export function leaderboardEntrance(root: HTMLElement) {
  const gsap = registerGsap()
  const cfg = motion.gsap.leaderboard
  const q = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel))
  const counters = q<HTMLElement>('[data-count]')
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: cfg.start, once: true } })

  tl.from(q('[data-podium-bar]'), { scaleY: 0, transformOrigin: '50% 100%', duration: cfg.bars, ease: cfg.barsEase, stagger: 0.12 }, 0)
  tl.from(q('[data-podium-card]'), { autoAlpha: 0, y: 32, duration: motion.gsap.reveal.duration, ease: motion.gsap.reveal.ease, stagger: 0.12 }, 0.25)
  tl.from(q('[data-board-row]'), { autoAlpha: 0, y: 16, duration: motion.gsap.reveal.duration, ease: motion.gsap.reveal.ease, stagger: cfg.stagger }, 0.4)
  for (const el of counters) {
    const target = Number(el.dataset.count ?? el.textContent ?? 0)
    const value = { n: 0 }
    tl.to(value, { n: target, duration: cfg.count, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(value.n))) }, 0.3)
  }

  return () => {
    tl.scrollTrigger?.kill()
    tl.kill()
    for (const el of counters) el.textContent = el.dataset.count ?? el.textContent
  }
}

/** Where every ranked player is right now (position and shown rank), so a re-order can animate from here. */
export function captureRanking(root: HTMLElement) {
  registerGsap()
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-flip-id]'))
  return {
    flip: Flip.getState(els, { props: 'opacity' }),
    tops: new Map(els.map((el) => [el.dataset.flipId!, el.getBoundingClientRect().top])),
    ranks: new Map(els.map((el) => [el.dataset.flipId!, Number(el.querySelector<HTMLElement>('[data-rank-value]')?.dataset.rankValue ?? 0)])),
  }
}

export type RankingSnapshot = ReturnType<typeof captureRanking>

/**
 * Slides each player from where they were to their new place, so rows visibly
 * switch: players moving up are highlighted and pass in front, players moving
 * down dim, and rank numbers count from the old place to the new one.
 * Matching is by [data-flip-id] (the player id), so a player moving from the
 * table onto the podium travels between the two.
 */
export function animateRanking(root: HTMLElement, from: RankingSnapshot) {
  const gsap = registerGsap()
  const cfg = motion.gsap.leaderboard
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-flip-id]'))

  const rising: HTMLElement[] = []
  const falling: HTMLElement[] = []
  for (const el of targets) {
    const before = from.tops.get(el.dataset.flipId!)
    if (before === undefined) continue
    const delta = el.getBoundingClientRect().top - before
    if (delta < -2) rising.push(el)
    else if (delta > 2) falling.push(el)
  }
  rising.forEach((el) => el.classList.add('rank-rising'))
  falling.forEach((el) => el.classList.add('rank-falling'))

  // Rank numbers travel with their row: 7 → 6 → 5 → 4.
  const counters = targets.flatMap((el) => {
    const label = el.querySelector<HTMLElement>('[data-rank-value]')
    const old = from.ranks.get(el.dataset.flipId!)
    const next = Number(label?.dataset.rankValue ?? 0)
    if (!label || !old || old === next) return []
    const value = { n: old }
    label.textContent = String(old)
    return [gsap.to(value, { n: next, duration: cfg.flip, ease: cfg.flipEase, onUpdate: () => (label.textContent = String(Math.round(value.n))) })]
  })

  const settle = () => {
    // Let the highlight fade out (rows transition their colours) after everyone lands.
    gsap.delayedCall(0.35, () => {
      rising.forEach((el) => el.classList.remove('rank-rising'))
      falling.forEach((el) => el.classList.remove('rank-falling'))
    })
  }

  const flip = Flip.from(from.flip, {
    targets,
    duration: cfg.flip,
    ease: cfg.flipEase,
    nested: true,
    prune: true,
    onComplete: settle,
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5 }),
    onLeave: (els) => gsap.to(els, { autoAlpha: 0, duration: 0.3 }),
  })
  return () => {
    flip.kill()
    counters.forEach((t) => t.progress(1).kill())
    rising.forEach((el) => el.classList.remove('rank-rising'))
    falling.forEach((el) => el.classList.remove('rank-falling'))
  }
}
