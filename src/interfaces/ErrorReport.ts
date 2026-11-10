/** What an error banner shows: which action failed, why, and how to tell support. */
export interface ErrorReport {
  /** "Couldn't start the match on Court 2" */
  title: string
  /** The cause in plain words, usually the API's own message. */
  message: string
  /** What the user can do next. */
  hint: string | null
  /** Per-field problems from the API, e.g. "games.0.a: Too big". */
  fields: { field: string; message: string }[]
  /** "HTTP 409 · conflict · POST /api/sessions/…/start · ref 3f9c…" */
  reference: string | null
}
