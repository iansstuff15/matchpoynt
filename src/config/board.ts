/** Session board presentation. */
export const board = {
  /** A court's countdown turns to a warning this long before its time limit. */
  timerWarningMs: 2 * 60_000,
  /** How often running timers repaint. */
  timerTickMs: 1000,
  /**
   * While dragging a player, the board scrolls only when the pointer is this
   * close to an edge (fraction of the visible height). dnd-kit's default (0.2)
   * scrolled the board as soon as someone picked up a player near the bottom of the queue.
   */
  dragAutoScrollEdge: 0.08,
  /** A queued player's wait turns to a warning after this long, so long waits stand out. */
  longWaitMs: 20 * 60_000,
  /** While players are still to check in, the board refreshes this often so QR check-ins appear. */
  checkInPollMs: 5000,
  /** A club's running session refreshes this often, so breaks players start from their phones appear. */
  clubSessionPollMs: 10_000,
  /** A player's live view of a session (and their list of running sessions) refreshes this often. */
  playerViewPollMs: 5000,
  /** Pixel size the check-in QR is drawn at (it scales to fit the dialog). */
  checkInQrSize: 320,
}
