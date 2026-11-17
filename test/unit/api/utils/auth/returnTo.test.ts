import { describe, expect, it, vi } from 'vitest'
import { actionLink, afterSignIn, providerCallbackUrl, returnPath } from '@/utils/auth/returnTo'

describe('returnPath', () => {
  it('returns to allowed app pages', () => {
    expect(returnPath('/app')).toBe('/app')
    expect(returnPath('/rankings')).toBe('/rankings')
  })

  it("returns to a finished session's page", () => {
    const page = '/app/3f2b8c1e-9a4d-4c7b-8e21-5d6f7a8b9c0d'
    expect(returnPath(page)).toBe(page)
  })

  it("returns to a player's live view, friends and a club's feedback page", () => {
    const id = '8f14e45f-ceea-467a-9575-3e1b2c3d4e5f'
    expect(returnPath(`/play/${id}`)).toBe(`/play/${id}`)
    expect(returnPath('/play')).toBe('/play')
    expect(returnPath('/friends')).toBe('/friends')
    expect(returnPath(`/clubs/${id}/feedback`)).toBe(`/clubs/${id}/feedback`)
    expect(returnPath('/play/not-a-session')).toBe('/app')
  })

  it("returns to someone's profile, by username only", () => {
    expect(returnPath('/u/ana.cruz')).toBe('/u/ana.cruz')
    expect(returnPath('/u/../app')).toBe('/app')
    expect(returnPath('/u/ab')).toBe('/app')
  })

  it('sends the removed past sessions and invoices pages to the board', () => {
    expect(returnPath('/app/past')).toBe('/app')
    expect(returnPath('/app/invoices')).toBe('/app')
  })

  it('returns to an invite, which skips the profile redirect (it has its own sign-up form)', () => {
    const page = '/invite/AbCdEfGhIjKlMnOpQrStUv'
    expect(returnPath(page)).toBe(page)
    expect(afterSignIn(page, false)).toBe(page)
    expect(returnPath('/invite/short')).toBe('/app')
  })

  it("returns to the clubs list, a club's dashboard and its pages", () => {
    expect(returnPath('/clubs')).toBe('/clubs')
    const page = '/clubs/0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4'
    expect(returnPath(page)).toBe(page)
    for (const sub of ['members', 'invoices', 'accounting']) expect(returnPath(`${page}/${sub}`)).toBe(`${page}/${sub}`)
  })

  it('sends anything else to the board, so links cannot redirect off-site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/app/../evil', '/app/not-a-session', '/clubs/x', '/clubs/0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4/nope', '/clubs/0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4/members/x', '/app/3f2b8c1e-9a4d-4c7b-8e21-5d6f7a8b9c0d/x', '/sign-in', '', null, undefined]) {
      expect(returnPath(bad)).toBe('/app')
    }
  })
})

describe('afterSignIn', () => {
  it('finishes the profile first', () => {
    expect(afterSignIn('/rankings', false)).toBe('/complete-profile')
    expect(afterSignIn('/rankings', true)).toBe('/rankings')
    // Without somewhere particular to go, the start page: players pick a club, "both" accounts how they're using the app.
    expect(afterSignIn('/app', true)).toBe('/start')
    expect(afterSignIn('/app', false)).toBe('/complete-profile')
  })
})

describe('emailed links and provider returns', () => {
  vi.stubEnv('APP_URL', 'https://matchpoynt.com')
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('FIREBASE_API_KEY', 'key')
  vi.stubEnv('FIREBASE_PROJECT_ID', 'project')
  vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'api@project.iam.gserviceaccount.com')
  vi.stubEnv('FIREBASE_PRIVATE_KEY', 'key')

  it('continues an emailed link to an allowed page', () => {
    expect(actionLink('verifyEmail', 'code1', '/clubs')).toBe('https://matchpoynt.com/api/auth/action?mode=verifyEmail&oobCode=code1&next=%2Fclubs')
  })

  it('never continues to a page off the allow-list', () => {
    expect(actionLink('verifyEmail', 'code1', 'https://evil.example')).toBe('https://matchpoynt.com/api/auth/action?mode=verifyEmail&oobCode=code1&next=%2Fapp')
  })

  it('carries the email a sign-in link needs to finish on any device', () => {
    const url = new URL(actionLink('signIn', 'code1', '/invite/AbCdEfGhIjKlMnOpQrStUv', 'ana@example.com'))
    expect(url.searchParams.get('next')).toBe('/invite/AbCdEfGhIjKlMnOpQrStUv')
    expect(url.searchParams.get('email')).toBe('ana@example.com')
  })

  it('brings Google and Apple back to the API', () => {
    expect(providerCallbackUrl()).toBe('https://matchpoynt.com/api/auth/callback')
  })
})
