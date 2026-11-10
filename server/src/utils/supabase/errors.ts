import { ApiError, conflict, unavailable } from '@/utils/http/errors'

interface DbError {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

/** Check constraints the user can trigger, explained in their terms. */
const checkMessages: Record<string, string> = {
  session_courts_label_check: 'Court names must be 1 to 60 characters.',
  session_players_name_check: 'Player names must be 1 to 60 characters.',
  sessions_public_slug_check: 'The public link code is malformed.',
  sessions_matchmaking_check: 'That matchmaking option does not exist.',
  profiles_display_name_check: 'Display names must be 2 to 30 characters.',
  profiles_first_name_check: 'First names must be 1 to 60 characters.',
  profiles_last_name_check: 'Last names must be 1 to 60 characters.',
  profiles_role_check: 'That account type does not exist.',
  clubs_name_check: 'Club names must be 1 to 60 characters.',
  club_members_email_check: 'Email addresses can be up to 254 characters.',
  club_invites_email_check: 'Enter a valid email address.',
  clubs_description_check: 'Club descriptions can be up to 1000 characters.',
  club_members_name_check: 'Member names must be 1 to 60 characters.',
  club_members_contact_check: 'Contact details can be up to 120 characters.',
  planned_sessions_title_check: 'Session titles must be 1 to 80 characters.',
  planned_sessions_matchmaking_check: 'That matchmaking option does not exist.',
  sessions_title_check: 'Session titles must be 1 to 80 characters.',
}

/**
 * Turns a Supabase/PostgREST error into an ApiError that says what went
 * wrong in plain words. The raw error is attached as `cause` and logged
 * server-side with the request id; it never reaches the client.
 */
export function dbFail(error: DbError | null): void {
  if (!error) return
  const text = `${error.message} ${error.details ?? ''}`
  const raise = (e: ApiError): never => {
    Object.assign(e, { cause: error })
    throw e
  }

  if (text.includes('invite_not_found')) raise(new ApiError('not_found', 'This invite is no longer valid. It may have been cancelled; ask the club for a new one.'))
  if (text.includes('invite_wrong_email')) raise(new ApiError('forbidden', 'This invite was sent to a different email address. Sign out, then open the link from that inbox.'))
  if (text.includes('invite_used')) raise(conflict('This invite has already been accepted by another account.'))
  if (text.includes('plan_not_found')) raise(new ApiError('not_found', 'That planned session no longer exists. It may have been started or deleted on another device.'))
  if (text.includes('version_conflict')) {
    raise(conflict('This session was changed on another device or tab. The board has been reloaded; try again.'))
  }
  if (error.code === '42501' || /row-level security/i.test(text)) {
    raise(new ApiError('forbidden', "You don't have access to this. It belongs to another account."))
  }
  if (error.code === '23505') {
    raise(
      conflict(
        text.includes('sessions_one_active_per_owner')
          ? 'You already have a session running. End it before starting another.'
          : 'That already exists.',
      ),
    )
  }
  if (error.code === '23503') raise(conflict('Something this change refers to no longer exists. Reload and try again.'))
  if (error.code === '23514') {
    const constraint = Object.keys(checkMessages).find((name) => text.includes(name))
    raise(new ApiError('invalid', constraint ? checkMessages[constraint]! : 'A value was outside what the database allows.'))
  }
  // Missing table (42P01, PGRST205), column (42703, PGRST204) or function (42883, PGRST202): migrations not applied.
  if (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code ?? '')) {
    raise(unavailable('The database is missing tables, columns or functions this version needs. Run the database migrations (pnpm db:migrate).'))
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(text) || error.code === undefined || error.code === '') {
    raise(unavailable("The API couldn't reach the database (Supabase). Check the project is running and SUPABASE_URL is correct."))
  }
  // The API verifies every Firebase token before querying, so Supabase refusing one means it doesn't trust Firebase yet.
  if (error.code === 'PGRST301' || /JWT|jwt/.test(text)) {
    raise(
      unavailable(
        "The database (Supabase) didn't accept the Firebase sign-in. Add Firebase with this project's id under Supabase > Authentication > Third-party Auth, then try again.",
      ),
    )
  }
  raise(new ApiError('server_error', `The database rejected the request (code ${error.code}).`))
}

/** Turns a Supabase Storage error into an ApiError in plain words. The raw error is kept as `cause`, for the log. */
export function storageFail(error: { message: string; statusCode?: string | number; status?: number } | null): void {
  if (!error) return
  const status = Number(error.statusCode ?? error.status ?? 0)
  const raise = (e: ApiError): never => {
    Object.assign(e, { cause: error })
    throw e
  }
  if (/bucket not found/i.test(error.message)) {
    raise(unavailable('Photo storage is not set up: the club-media bucket is missing. Run the database migrations (pnpm db:migrate).'))
  }
  if (status === 403 || /row-level security|unauthorized/i.test(error.message)) {
    raise(new ApiError('forbidden', "You can't change photos that belong to another account."))
  }
  if (status === 413 || /too large|exceeded the maximum/i.test(error.message)) raise(new ApiError('invalid', 'That photo is larger than storage allows.'))
  if (/mime type|invalid_mime/i.test(error.message)) raise(new ApiError('invalid', 'Photos must be JPEG, PNG or WebP images.'))
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(error.message)) {
    raise(unavailable("The API couldn't reach photo storage (Supabase Storage). Check the project is running and SUPABASE_URL is correct."))
  }
  raise(new ApiError('server_error', `Photo storage rejected the request${status ? ` (HTTP ${status})` : ''}.`))
}
