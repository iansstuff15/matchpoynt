/** Outgoing email through Resend (https://resend.com/docs/api-reference/emails/send-email). */
export const emailConfig = {
  resendEndpoint: 'https://api.resend.com/emails',
  /** How long to wait for Resend before giving up on an email. */
  timeoutMs: 10_000,
}
