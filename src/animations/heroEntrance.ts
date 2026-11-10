import { gsap } from '@/animations/registerGsap'
import { heroIntro } from '@/animations/heroIntro'
import { afterSplash, isSplashActive } from '@/utils/motion/splashEvents'

/**
 * The hero's entrance, timed with the splash: kept hidden while the splash
 * plays, then started when the splash hands over (or straight away if there
 * is no splash).
 */
export function heroEntrance(root: HTMLElement) {
  const title = root.querySelector<HTMLElement>('[data-wave]')
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (!title) return () => undefined
  if (isSplashActive()) gsap.set([title, ...items], { autoAlpha: 0 })
  const cleanups: (() => void)[] = []
  cleanups.push(afterSplash(() => cleanups.push(heroIntro(title, items))))
  return () => cleanups.forEach((fn) => fn())
}
