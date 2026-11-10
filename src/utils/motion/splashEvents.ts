const DONE = 'matchpoynt:splash-done'

/** True while the intro splash covers the page. */
export function isSplashActive(): boolean {
  return document.documentElement.dataset.splash === 'on'
}

export function setSplashActive(active: boolean): void {
  if (active) document.documentElement.dataset.splash = 'on'
  else if (isSplashActive()) {
    delete document.documentElement.dataset.splash
    window.dispatchEvent(new Event(DONE))
  }
}

/** Runs `callback` once the splash hands over to the page (at once if there is no splash). */
export function afterSplash(callback: () => void): () => void {
  if (!isSplashActive()) {
    callback()
    return () => undefined
  }
  window.addEventListener(DONE, callback, { once: true })
  return () => window.removeEventListener(DONE, callback)
}
