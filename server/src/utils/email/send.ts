import { emailConfig } from '@/config/email'
import { env } from '@/config/env'
import type { Email } from '@/utils/email/templates'
import { unavailable } from '@/utils/http/errors'

// Sends the API's own emails through Resend's HTTP API (RESEND_API_KEY, EMAIL_FROM,
// EMAIL_REPLY_TO). One request per email; no SDK, so nothing native in the bundle.

/** Whether outgoing email is set up. */
export const emailConfigured = (): boolean => Boolean(env().RESEND_API_KEY)

/** Sends one email. A failure becomes a plain message for the person; Resend's answer is logged with the request. */
export async function sendEmail(to: string, email: Email): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO } = env()
  if (!RESEND_API_KEY) throw unavailable('Email isn’t set up on the API, so it can’t send this. Set RESEND_API_KEY in its environment.')
  const response = await fetch(emailConfig.resendEndpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject: email.subject, html: email.html, text: email.text, ...(EMAIL_REPLY_TO && { reply_to: EMAIL_REPLY_TO }) }),
    signal: AbortSignal.timeout(emailConfig.timeoutMs),
  }).catch((cause) => {
    throw Object.assign(unavailable("The API couldn't reach Resend to send the email. Try again in a moment."), { cause })
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { name?: string; message?: string }
    throw Object.assign(unavailable("The API couldn't send the email: Resend refused it. Check RESEND_API_KEY and that EMAIL_FROM's domain is verified in Resend."), {
      cause: new Error(`Resend ${response.status}: ${detail.name ?? ''} ${detail.message ?? ''}`.trim()),
    })
  }
}
