import { env } from '@/config/env'
import { actionLink } from '@/utils/auth/returnTo'
import { sendEmail } from '@/utils/email/send'
import { changeEmailEmail, clubInviteEmail, passwordResetEmail, verifyEmailEmail } from '@/utils/email/templates'
import { actionCode } from '@/utils/firebase/admin'

// The account emails, sent by the API instead of Firebase: Firebase makes the
// one-time code (with the service account, sending nothing), the API wraps it
// in its own link to /api/auth/action and emails it with Matchpoynt's template.
// The continue URL only matters to Firebase's own pages; ours carry `next` themselves.

const appUrl = () => env().APP_URL
const continueUrl = () => `${appUrl()}/api/auth/action`

/** A link to choose a new password. Firebase answers EMAIL_NOT_FOUND for an email without an account. */
export async function sendPasswordResetEmail(to: string): Promise<void> {
  const code = await actionCode('PASSWORD_RESET', to, continueUrl())
  await sendEmail(to, passwordResetEmail({ appUrl: appUrl(), to, link: actionLink('resetPassword', code, '/reset-password') }))
}

/** "Confirm your email", returning to `next` afterwards. */
export async function sendVerificationEmail(to: string, next: string): Promise<void> {
  const code = await actionCode('VERIFY_EMAIL', to, continueUrl())
  await sendEmail(to, verifyEmailEmail({ appUrl: appUrl(), to, link: actionLink('verifyEmail', code, next) }))
}

/** A link to the new address; the account moves to it once it's opened. */
export async function sendEmailChangeEmail(currentEmail: string, newEmail: string, next: string): Promise<void> {
  const code = await actionCode('VERIFY_AND_CHANGE_EMAIL', currentEmail, continueUrl(), newEmail)
  await sendEmail(newEmail, changeEmailEmail({ appUrl: appUrl(), to: newEmail, currentEmail, link: actionLink('verifyAndChangeEmail', code, next) }))
}

/** A club invite: a sign-in link (making the account if there's none) that opens the invite at `next`. */
export async function sendInviteEmail(to: string, next: string, clubName: string): Promise<void> {
  const code = await actionCode('EMAIL_SIGNIN', to, continueUrl())
  await sendEmail(to, clubInviteEmail({ appUrl: appUrl(), to, clubName, link: actionLink('signIn', code, next, to) }))
}
