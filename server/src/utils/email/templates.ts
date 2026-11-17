// The emails the API sends itself: password resets, email confirmations,
// changes of email and club invites. Pure functions: each returns the subject,
// the HTML (email-safe: tables and inline styles, the logo as a PNG from the
// site) and a plain-text version. Values are escaped before they go in.
// No `@/` imports, so `pnpm email:templates` can load this file for previews.

export interface Email {
  subject: string
  html: string
  text: string
}

/** What every email needs: the site's address (for the logo) and who it's to. */
interface Base {
  appUrl: string
  to: string
}

const appName = 'Matchpoynt'
const tagline = 'Fair queues. Full courts. Every sport.'

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

interface Content {
  title: string
  preheader: string
  heading: string
  /** Paragraphs, already escaped where they hold values. */
  paragraphs: string[]
  button: string
  link: string
  footnote: string
}

function layout(base: Base, c: Content): string {
  const link = escape(c.link)
  const paragraphs = c.paragraphs.map((p) => `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">${p}</p>`).join('\n                ')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escape(c.title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(c.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td align="left" style="padding:0 8px 20px 8px;">
                <img src="${escape(base.appUrl)}/brand/logo-email.png" width="72" height="45" alt="${appName}" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:20px;padding:40px 36px;font-family:${font};color:#3f3f46;">
                <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#101a33;">${escape(c.heading)}</h1>
                ${paragraphs}
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                  <tr>
                    <td align="center" bgcolor="#ff5a4e" style="border-radius:999px;">
                      <a href="${link}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escape(c.button)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#71717a;">If the button doesn't work, copy this link into your browser:</p>
                <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${link}" target="_blank" style="color:#e14b3f;">${link}</a></p>
                <p style="margin:0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.6;color:#71717a;">${escape(c.footnote)}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 8px 0 8px;font-family:${font};font-size:12px;line-height:1.6;color:#a1a1aa;">
                Sent by ${appName} to ${escape(base.to)} · ${tagline}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

/** The plain-text part: the same words, the link on its own line. */
function plain(base: Base, c: Content, paragraphs: string[]): string {
  return [c.heading, '', ...paragraphs.flatMap((p) => [p, '']), `${c.button}: ${c.link}`, '', c.footnote, '', `Sent by ${appName} to ${base.to}`].join('\n')
}

function email(base: Base, subject: string, c: Omit<Content, 'paragraphs'> & { paragraphs: string[] }): Email {
  return { subject, html: layout(base, { ...c, paragraphs: c.paragraphs.map(escape) }), text: plain(base, c, c.paragraphs) }
}

/** "Choose a new password": a reset link for the account's email. */
export function passwordResetEmail(base: Base & { link: string }): Email {
  return email(base, `Choose a new ${appName} password`, {
    title: 'Choose a new password',
    preheader: `Your link to choose a new ${appName} password. It works once.`,
    heading: 'Choose a new password',
    paragraphs: [`We got a request to reset the password for your ${appName} account, ${base.to}.`, 'Open the link below to choose a new one. It works once and expires after a while, so use it soon.'],
    button: 'Choose a new password',
    link: base.link,
    footnote: "Didn't ask for this? You can ignore this email: your password stays the same, and nobody can change it without this link.",
  })
}

/** "Confirm your email": after signing up (and again when signing in before confirming). */
export function verifyEmailEmail(base: Base & { link: string }): Email {
  return email(base, `Confirm your email for ${appName}`, {
    title: 'Confirm your email',
    preheader: `One tap to confirm your email and start playing on ${appName}.`,
    heading: 'Confirm your email',
    paragraphs: [`Welcome to ${appName}! Confirm that ${base.to} is yours to finish setting up your account.`, 'Once it’s confirmed you can sign in, join clubs and follow your sessions from Playing now.'],
    button: 'Confirm my email',
    link: base.link,
    footnote: "Didn't sign up? Someone may have typed your address by mistake. You can ignore this email and no account will be confirmed.",
  })
}

/** "Confirm your new email": sent to the new address; the change happens once it's opened. */
export function changeEmailEmail(base: Base & { link: string; currentEmail: string }): Email {
  return email(base, `Confirm your new ${appName} email`, {
    title: 'Confirm your new email',
    preheader: `Switch your ${appName} sign-in email to this one.`,
    heading: 'Confirm your new email',
    paragraphs: [`You asked to sign in to ${appName} with ${base.to} instead of ${base.currentEmail}.`, 'Open the link below to make the switch. Until then nothing changes, and you keep signing in with your current email.'],
    button: 'Use this email',
    link: base.link,
    footnote: "Didn't ask for this? You can ignore this email and nothing changes. The account's current email is told if the switch is made, with a way to undo it.",
  })
}

/** A club invite: the link signs them in (making the account if they have none) and opens the invite. */
export function clubInviteEmail(base: Base & { link: string; clubName: string }): Email {
  return email(base, `${base.clubName} invited you to ${appName}`, {
    title: `Join ${base.clubName}`,
    preheader: `${base.clubName} added you to its members on ${appName}.`,
    heading: `Join ${base.clubName} on ${appName}`,
    paragraphs: [
      `${base.clubName} added you to its members on ${appName}, where it runs its sessions: fair queues, courts, scores and leaderboards.`,
      'Open the link below to accept. If you’re new, you’ll choose a username and password; if you already have an account, you’re in.',
    ],
    button: `Join ${base.clubName}`,
    link: base.link,
    footnote: "Not expecting this? You can ignore this email: nothing happens unless you open the link. It works once, for a limited time.",
  })
}
