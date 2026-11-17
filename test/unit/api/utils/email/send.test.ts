import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const email = { subject: 'Choose a new Matchpoynt password', html: '<p>Hi</p>', text: 'Hi' }

function stubEnv(extra: Record<string, string> = {}) {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('APP_URL', 'https://matchpoynt.com')
  vi.stubEnv('FIREBASE_API_KEY', 'key')
  vi.stubEnv('FIREBASE_PROJECT_ID', 'project')
  vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'api@project.iam.gserviceaccount.com')
  vi.stubEnv('FIREBASE_PRIVATE_KEY', 'key')
  vi.stubEnv('EMAIL_FROM', '')
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v)
}

// env() is read once per module load, so each test loads the sender afresh.
const load = async () => (await import('@/utils/email/send')).sendEmail

describe('sendEmail (Resend)', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts the email to Resend with the key, using the test sender while EMAIL_FROM is empty', async () => {
    stubEnv({ RESEND_API_KEY: 're_test' })
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await (await load())('ana@example.com', email)
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test')
    expect(JSON.parse(init.body)).toEqual({ from: 'Matchpoynt <onboarding@resend.dev>', to: ['ana@example.com'], subject: email.subject, html: email.html, text: email.text })
  })

  it('says plainly when Resend refuses, and when no key is set', async () => {
    stubEnv({ RESEND_API_KEY: 're_test' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"name":"validation_error","message":"domain not verified"}', { status: 403 })))
    await expect((await load())('ana@example.com', email)).rejects.toThrow('Resend refused it')

    vi.resetModules()
    vi.unstubAllEnvs()
    stubEnv()
    await expect((await load())('ana@example.com', email)).rejects.toThrow('Set RESEND_API_KEY')
  })
})
