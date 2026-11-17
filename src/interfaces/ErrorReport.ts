/** What an error banner shows: which action failed, and why, in a sentence. */
export interface ErrorReport {
  /** "Couldn't start the match on Court 2" */
  title: string
  /** The cause in plain words: the API's own message, or a short one when there's no answer. */
  message: string
}
