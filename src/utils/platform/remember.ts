// What this browser had open last (a session, a club), and whether the
// sidebar was collapsed, so the app reopens the same way.
// Per-viewer conveniences only: when storage is blocked, callers fall back
// to the newest one.

const keys = {
  session: 'matchpoynt.lastSession',
  club: 'matchpoynt.lastClub',
  sidebar: 'matchpoynt.sidebar',
  boardTools: 'matchpoynt.boardTools',
  /** Club ids whose "Finish setting up" dialog has opened by itself once already, comma separated. */
  setupShown: 'matchpoynt.setupShown',
  /** Releases whose "What's new" each account has seen here: "<account>@<version>", comma separated. */
  changelogSeen: 'matchpoynt.changelogSeen',
  /** "on" while this browser alerts the player when they're called up next or onto a court. */
  calledAlert: 'matchpoynt.calledAlert',
  /** How a "both" account is using the app: "player" or "host" (chosen on the start page when signing in). */
  mode: 'matchpoynt.mode',
  /** The club a player picked on the club picker; the app wears its colours and photo. */
  playerClub: 'matchpoynt.playerClub',
  /** The accounting pages' date filter: a preset, or "custom|<from>|<to>". */
  period: 'matchpoynt.period',
} as const

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
