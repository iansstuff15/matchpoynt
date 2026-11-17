import { motion } from '@/config/motion'

/**
 * Resolves once the app has finished loading under the splash: it has left
 * the landing page, nothing is marked `aria-busy` and no skeleton is left
 * (outside `ignore`, the overlay itself), for a few frames in a row so a
 * page that loads in steps counts as done only at the end. Never waits
 * longer than `motion.handoff.maxWaitMs`.
 */
export function waitForAppReady(ignore: () => Element | null): Promise<void> {
  const { maxWaitMs, settleFrames } = motion.handoff
  const started = performance.now()
  const busy = () =>
    [...document.querySelectorAll('[aria-busy="true"], [data-slot="skeleton"]')].some((el) => {
      const overlay = ignore()
      return !overlay || !overlay.contains(el)
    })
  return new Promise((resolve) => {
    let quiet = 0
    const check = () => {
      const settled = window.location.pathname !== '/' && !busy()
      quiet = settled ? quiet + 1 : 0
      if (quiet >= settleFrames || performance.now() - started > maxWaitMs) resolve()
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

/**
 * Resolves once the theme's colours (`names`, CSS variables on the page root)
 * have stopped changing for `motion.handoff.themeSettleFrames` frames in a
 * row, so a club's colours that arrive after the page has loaded are in place
 * before the splash turns to them. Never waits longer than `maxWaitMs`.
 */
export function waitForStableTheme(names: string[]): Promise<void> {
  const { maxWaitMs, themeSettleFrames } = motion.handoff
  const started = performance.now()
  const read = () => {
    const style = getComputedStyle(document.documentElement)
    return names.map((n) => style.getPropertyValue(`--${n}`).trim()).join('|')
  }
  return new Promise((resolve) => {
    let last = read()
    let still = 0
    const check = () => {
      const now = read()
      still = now === last ? still + 1 : 0
      last = now
      if (still >= themeSettleFrames || performance.now() - started > maxWaitMs) resolve()
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}
