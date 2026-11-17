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
  club_members_role_check: 'That club role does not exist.',
  club_feedback_forms_title_check: 'Feedback form titles must be 1 to 80 characters.',
  club_feedback_forms_intro_check: 'The introduction can be up to 500 characters.',
  friendships_self_check: "You can't add yourself as a friend.",
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
  // Refusals raised by the joining functions (0032), in the user's words.
  const refusals: Record<string, string> = {
    profile_incomplete: 'Finish your profile (pick a username) before joining a club.',
    club_not_found: "That club doesn't exist any more.",
    not_a_member: 'Join the club before asking to join its sessions.',
    feedback_not_member: 'Only members of the club can answer its feedback form.',
    feedback_closed: 'The club has turned its feedback form off, so it isn\'t taking answers now.',
    feedback_not_played: `That session isn't one you played in, or it ended too long ago to answer for.`,
    feedback_answered: 'You have already answered for this session. Thanks!',
    friend_request_gone: 'That friend request is no longer open. It may have been cancelled or answered on another device.',
    session_not_open: "That session can't be joined: it may have started, ended or been removed.",
    invite_not_found: 'That invite is no longer open. The club may have cancelled it.',
  }
  const refusal = Object.keys(refusals).find((code) => text.includes(code))
  if (refusal) raise(new ApiError(['club_not_found', 'invite_not_found', 'friend_request_gone'].includes(refusal) ? 'not_found' : 'conflict', refusals[refusal]!))
  if (error.code === '23505' && text.includes('friendships_pair_idx')) {
    raise(conflict("You're already friends with them, or a friend request between you is already open."))
  }
  if (error.code === '23505' && text.includes('club_feedback_responses_once_idx')) {
    raise(conflict('You have already answered for this session. Thanks!'))
  }
  if (error.code === '23505' && text.includes('clubs_handle_idx')) {
    raise(new ApiError('conflict', 'Another club has just taken that handle. Pick another.', { handle: 'Taken' }))
  }
  if (error.code === '23505' && text.includes('profiles_username_idx')) {
    raise(new ApiError('conflict', 'Someone has just taken that username. Pick another.', { username: 'Taken', profile: 'Username taken' }))
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
