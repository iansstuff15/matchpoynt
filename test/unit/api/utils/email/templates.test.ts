import { describe, expect, it } from 'vitest'
import { changeEmailEmail, clubInviteEmail, passwordResetEmail, verifyEmailEmail } from '@/utils/email/templates'

const base = { appUrl: 'https://matchpoynt.com', to: 'ana@example.com', link: 'https://matchpoynt.com/api/auth/action?mode=resetPassword&oobCode=abc&next=%2Fapp' }

describe('account emails', () => {
  it('carry the link in the button, as text to copy and in the plain-text part', () => {
    const email = passwordResetEmail(base)
    expect(email.subject).toBe('Choose a new Matchpoynt password')
    expect(email.html).toContain('href="https://matchpoynt.com/api/auth/action?mode=resetPassword&amp;oobCode=abc&amp;next=%2Fapp"')
    expect(email.text).toContain(`Choose a new password: ${base.link}`)
    expect(email.html).toContain('src="https://matchpoynt.com/brand/logo-email.png"')
  })

  it('escape names and addresses that go into the HTML', () => {
    const email = clubInviteEmail({ ...base, clubName: '<b>Smash</b> & "Co"' })
    expect(email.html).not.toContain('<b>Smash</b>')
    expect(email.html).toContain('&lt;b&gt;Smash&lt;/b&gt; &amp; &quot;Co&quot;')
    expect(email.subject).toBe('<b>Smash</b> & "Co" invited you to Matchpoynt')
  })

  it('say who they are for, and a change of email names both addresses', () => {
    expect(verifyEmailEmail(base).text).toContain('ana@example.com')
    const change = changeEmailEmail({ ...base, to: 'ana.new@example.com', currentEmail: 'ana@example.com' })
    expect(change.text).toContain('with ana.new@example.com instead of ana@example.com')
    expect(change.html).toContain('Sent by Matchpoynt to ana.new@example.com')
  })
})
