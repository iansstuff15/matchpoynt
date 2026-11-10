import { afterEach, describe, expect, it, vi } from 'vitest'

describe('features', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const load = async () => (await import('@/config/features')).features()

  it('falls back to defaults', async () => {
    const f = await load()
    expect(f.web.signIn).toBe(true)
    expect(f.web.signInApple).toBe(true)
  })

  it('reads per-method sign-in toggles', async () => {
    vi.stubEnv('FEATURE_WEB_SIGN_IN_APPLE', 'false')
    expect((await load()).web.signInApple).toBe(false)
  })

  it('reads FEATURE_* variables', async () => {
    vi.stubEnv('FEATURE_WEB_PUBLISH_SESSIONS', 'false')
    vi.stubEnv('FEATURE_DESKTOP_OFFLINE_MODE', 'on')
    const f = await load()
    expect(f.web.publishSessions).toBe(false)
    expect(f.desktop.offlineMode).toBe(true)
  })

  it('rejects malformed values', async () => {
    vi.stubEnv('FEATURE_WEB_RANKINGS', 'maybe')
    await expect(load()).rejects.toThrow('FEATURE_WEB_RANKINGS must be true or false')
  })
})
