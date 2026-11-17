import type { PlayerLiveStatus } from '@matchpoynt/shared'

/** Short labels for where a player stands, beside the API's one-line status. */
export const playerStatusLabels: Record<PlayerLiveStatus, string> = {
  playing: 'On court',
  up_next: 'Up next',
  queued: 'In the queue',
  placed: 'Placed on a court',
  on_break: 'On a break',
  checking_in: 'Not checked in',
  not_in_session: 'Not in this session',
}

/** Rows the live view's skeleton draws while it loads. */
export const playSkeleton = { courts: 3, queue: 6, sessions: 2 }

/** The players' live view. */
export const play = {
  /** The phone's buzz when they're called up next or onto a court (ms on, off, on). */
  calledVibration: [200, 100, 200],
  /** What the alert says when they're called. */
  called: {
    up_next: { title: "You're up next", body: 'Your match starts on the next free court. Get ready.' },
    playing: { title: "You're on court", body: 'Your match is starting. Head to your court.' },
  },
}
