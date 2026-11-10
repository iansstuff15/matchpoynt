// Per-tab flags (e.g. "splash already seen"). Storage can be unavailable in
// private windows; then the flag lasts for this page view only.

export function readSessionFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeSessionFlag(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Storage unavailable: nothing to persist.
  }
}
