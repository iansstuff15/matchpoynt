// What this browser had open last (a session, a club), and whether the
// sidebar was collapsed, so the app reopens the same way.
// Per-viewer conveniences only: when storage is blocked, callers fall back
// to the newest one.

const keys = { session: 'matchpoynt.lastSession', club: 'matchpoynt.lastClub', sidebar: 'matchpoynt.sidebar', boardTools: 'matchpoynt.boardTools' } as const

export function recall(what: keyof typeof keys): string | null {
  try {
    return window.localStorage.getItem(keys[what])
  } catch {
    return null
  }
}

export function remember(what: keyof typeof keys, value: string): void {
  try {
    window.localStorage.setItem(keys[what], value)
  } catch {
    // Storage blocked (private window): nothing to remember.
  }
}

/** Forgets what this browser had open (e.g. a session that was deleted). */
export function forget(what: keyof typeof keys): void {
  try {
    window.localStorage.removeItem(keys[what])
  } catch {
    // Storage blocked: nothing was remembered.
  }
}
