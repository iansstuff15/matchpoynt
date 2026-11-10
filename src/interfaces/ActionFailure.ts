/** The last board action that failed, for the board's error banner. */
export interface ActionFailure {
  /** Completes "Couldn't …". */
  action: string
  error: unknown
  retry: () => void
}
