import { readFileSync } from 'node:fs'
import { test as base, type Page, type Route } from '@playwright/test'
import { defaultFeatures, type ApiErrorBody, type ClubSummary, type Features } from '@matchpoynt/shared'
import { manageClubsBlockedReason, runSessionsBlockedReason } from '@/utils/profile/rules'
import { FakeAccounting } from './fakeAccounting'
import { FakeClubs } from './fakeClubs'
import { FakeCommunity } from './fakeCommunity'
import { fakeAccountId, FakeProfile } from './fakeProfile'
import { FakeSessions, type FakeResponse } from './fakeSessions'

/** The app's version (root package.json), which "What's new" is keyed by. */
const appVersion = (JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string }).version

/** What the mocked API answers with. Tests change it before (or between) page loads. */
export interface MockState {
  features: Features
}

/** A club as the API lists it, to seed with `api.clubs.seed(...)`. Its handle comes from its name, as every club needs one (pass `handle: null` for a club from before handles). */
export function club(id: string, name: string, extra: Partial<ClubSummary> = {}): ClubSummary {
  const centred = { x: 50, y: 50, zoom: 1 }
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30)
  return { id, name, description: null, avatarUrl: null, coverUrl: null, avatarPosition: centred, coverPosition: centred, handle, socialLinks: [], theme: null, savedThemes: [], paymentQrs: [], fee: null, feeSummary: null, members: 0, plannedSessions: 0, joining: { approval: 'manual', welcomeMessage: null, welcomeLinks: [] }, ...extra }
}

/** Guest mode (sign-in off) with clubs, badges and GIF search on and the splash off, so pages open straight away. */
export function guestFeatures(): Features {
  return { ...defaultFeatures, web: { ...defaultFeatures.web, signIn: false, splash: false, gifSearch: true } }
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'X-Request-Id': 'test-request' }, body: JSON.stringify(body) })

const reply = (route: Route, answer: FakeResponse) =>
  answer.body === undefined ? route.fulfill({ status: answer.status }) : json(route, answer.body, answer.status)

const notFound = (route: Route, message: string) =>
  json(route, { error: { code: 'not_found', message, requestId: 'test-request' } } satisfies ApiErrorBody, 404)

/**
 * Stands in for the Matchpoynt API at `/api/*`, so UI tests run without
 * Supabase. Sessions and clubs run on the API's real rules (`FakeSessions`,
 * `FakeClubs`); config answers from `state`. Unknown requests answer 404 (never reaching a
 * real API) and are recorded in `unhandled` so a test can assert none happened.
 */
export class MockApi {
  state: MockState = { features: guestFeatures() }
  readonly sessions = new FakeSessions()
  readonly clubs = new FakeClubs()
  readonly accounting = new FakeAccounting()
  readonly profile = new FakeProfile()
  /** Club feedback, friends and the players' live view. */
  readonly community = new FakeCommunity(this.clubs, this.sessions, () => {
    const user = this.profile.user
    const me = this.profile.me().user
    return user && me ? { id: user.id, card: { userId: user.id, username: me.username, displayName: me.displayName, email: user.email, avatarUrl: me.avatarUrl, avatarPosition: { x: 50, y: 50, zoom: 1 } } } : null
  })

  constructor() {
    // Club badges show on the leaderboards of the sessions a club runs, and count their history.
    this.sessions.badgesFor = (clubId) => this.clubs.badgeViews(clubId)
    this.sessions.clubFor = (clubId) => this.clubs.leaderboardClub(clubId)
    this.sessions.viewerName = () => (this.profile.user ? this.profile.profile.username : null)
    this.clubs.historyFor = (clubId) => this.sessions.history(clubId)
    // Club pages list the club's sessions; accounting counts their invoices.
    this.clubs.sessionsFor = (clubId) => this.sessions.clubSessions(clubId).views
    this.accounting.hasClub = (clubId) => this.clubs.has(clubId)
    this.accounting.sessionsFor = (clubId) => this.sessions.clubSessions(clubId)
    this.accounting.rosterFor = (clubId) => this.clubs.rosterOf(clubId)
    // The directory knows who's asking, and members join the club's running sessions.
    this.clubs.viewer = () => {
      const user = this.profile.user
      return user ? { id: user.id, username: this.profile.profile.username, tiers: this.profile.profile.sports, avatarUrl: this.profile.me().user?.avatarUrl ?? null } : null
    }
    this.clubs.runningIn = (clubId) => this.sessions.runningIn(clubId)
    this.clubs.addToSession = (sessionId, member) => this.sessions.addFromClub(sessionId, member)
  }
  readonly unhandled: string[] = []

  async install(page: Page) {
    // "What's new" opens once per release; mark this release seen for the test accounts so it doesn't cover every test
    // (only when nothing is stored yet, so a test can clear it to see the dialog: see e2e/app/whatsNew.spec.ts).
    await page.addInitScript(
      ({ key, value }) => {
        try {
          if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value)
        } catch {
          // Storage blocked: the dialog shows, as it would for a real viewer.
        }
      },
      { key: 'matchpoynt.changelogSeen', value: ['guest', fakeAccountId].map((a) => `${a}@${appVersion}`).join(',') },
    )
    // Only the API itself: a `**/api/**` glob would also catch Vite's modules under src/utils/api/.
    await page.route((url) => url.pathname.startsWith('/api/'), (route) => this.handle(route))
  }

  private async handle(route: Route) {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const path = pathname.replace(/^\/api/, '')
    const method = request.method()

    if (method === 'GET' && path === '/config') return json(route, { features: this.state.features })
    if (method === 'GET' && path === '/auth/me') return json(route, this.profile.me())
    if (method === 'POST' && path === '/auth/signout') {
      this.profile.user = null
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && path === '/auth/username-check') return json(route, this.profile.usernameCheck(new URL(request.url()).searchParams.get('value') ?? ''))
    // Forgot password: always the same answer (204), as the API gives whether or not the account exists; what was asked is kept for tests.
    if (method === 'POST' && path === '/auth/forgot-password') {
      this.profile.resetRequests.push((JSON.parse(request.postData() ?? '{}') as { email?: string }).email ?? '')
      return route.fulfill({ status: 204 })
    }
    // Changing the sign-in email: a link goes to the new one (204), unless it's already the account's email.
    if (method === 'POST' && path === '/auth/email') {
      const email = ((JSON.parse(request.postData() ?? '{}') as { email?: string }).email ?? '').trim().toLowerCase()
      if (email === this.profile.user?.email) {
        return json(route, { error: { code: 'invalid', message: 'That is already your sign-in email.', fields: { email: 'Unchanged' }, requestId: 'test-request' } } satisfies ApiErrorBody, 400)
      }
      this.profile.emailChanges.push(email)
      return route.fulfill({ status: 204 })
    }
    if (method === 'POST' && path === '/auth/lookup') return json(route, this.profile.lookup((JSON.parse(request.postData() ?? '{}') as { email?: string }).email ?? ''))
    // Player-only accounts don't run clubs: the club manager and its accounting answer 403, as the API's requireClubManager does.
    if ((path === '/clubs' || path.startsWith('/clubs/') || path.startsWith('/accounting/')) && this.state.features.web.signIn && this.profile.user) {
      const blocked = manageClubsBlockedReason(this.profile.profile.role, false)
      if (blocked) return json(route, { error: { code: 'forbidden', message: blocked, requestId: 'test-request' } } satisfies ApiErrorBody, 403)
    }
    // Nor do they run sessions: the board, its history and invoices, and member suggestions answer 403, as requireSessionRunner does.
    if (['/sessions', '/invoices', '/members'].some((p) => path === p || path.startsWith(`${p}/`)) && this.state.features.web.signIn && this.profile.user) {
      const blocked = runSessionsBlockedReason(this.profile.profile.role, false)
      if (blocked) return json(route, { error: { code: 'forbidden', message: blocked, requestId: 'test-request' } } satisfies ApiErrorBody, 403)
    }
    if (method === 'GET' && path === '/clubs/handle-check') {
      const params = new URL(request.url()).searchParams
      return json(route, this.clubs.handleCheck(params.get('value') ?? '', params.get('club')))
    }
    if (method === 'GET' && path === '/members/suggestions') return json(route, { suggestions: [] })
    if (method === 'GET' && path === '/people/search') {
      const params = new URL(request.url()).searchParams
      return json(route, this.clubs.searchPeople(params.get('q') ?? '', params.get('club')))
    }
    if (/^\/(clubs\/[^/]+|directory\/[^/]+)\/(feedback|announcements(\/[^/]+)?)$/.test(path) || path === '/friends' || path.startsWith('/friends/') || path === '/play' || path.startsWith('/play/') || path.startsWith('/users/')) {
      const answer = this.community.handle(method, `${path}${new URL(request.url()).search}`, request.postData())
      if (answer) return reply(route, answer)
    }
    const card = /^\/public\/clubs\/([^/]+)$/.exec(path)
    if (method === 'GET' && card) return reply(route, this.clubs.joinCard(decodeURIComponent(card[1]!)))
    if (path === '/directory' || path.startsWith('/directory/')) {
      const answer = await this.clubs.directory(method, `${path}${new URL(request.url()).search}`, { text: request.postData(), form: async () => new FormData() })
      if (answer) return reply(route, answer)
    }
    if (method === 'GET' && path === '/gifs/search') {
      const params = new URL(request.url()).searchParams
      return json(route, this.clubs.search(params.get('q') ?? '', Number(params.get('offset') ?? 0)))
    }
    if (path === '/sessions' || path.startsWith('/sessions/')) {
      const search = new URL(request.url()).search
      const answer = this.sessions.handle(method, path === '/sessions/ended' && search ? `${path}${search}` : path, await request.allHeaders(), request.postData())
      if (answer) return reply(route, answer)
    }
    if (path === '/invoices' || path.startsWith('/invoices/')) {
      const answer = this.sessions.handleInvoices(method, `${path}${new URL(request.url()).search}`, request.postData())
      if (answer) return reply(route, answer)
    }
    if (path.startsWith('/accounting/')) {
      const answer = this.accounting.handle(method, `${path}${new URL(request.url()).search}`, request.postData())
      if (answer) return reply(route, answer)
    }
    if (path === '/clubs' || path.startsWith('/clubs/')) {
      const answer = await this.clubs.handle(method, path === '/clubs' ? `${path}${new URL(request.url()).search}` : path, {
        text: request.postData(),
        form: () =>
          new Request('http://fake.test/upload', {
            method,
            headers: { 'content-type': request.headers()['content-type'] ?? '' },
            body: new Uint8Array(request.postDataBuffer() ?? []),
          }).formData(),
      })
      if (answer) return reply(route, answer)
    }
    if (path === '/profile' || path.startsWith('/profile/')) {
      const answer = await this.profile.handle(method, `${path}${new URL(request.url()).search}`, {
        text: request.postData(),
        form: () =>
          new Request('http://fake.test/upload', {
            method,
            headers: { 'content-type': request.headers()['content-type'] ?? '' },
            body: new Uint8Array(request.postDataBuffer() ?? []),
          }).formData(),
      })
      if (answer) return reply(route, answer)
    }
    const media = /^\/media\/(.+)$/.exec(path)
    if (method === 'GET' && media) {
      const photo = this.clubs.photo(media[1]!) ?? this.profile.media.get(media[1]!) ?? null
      if (photo) return route.fulfill({ status: 200, contentType: media[1]!.endsWith('.gif') ? 'image/gif' : 'image/webp', body: Buffer.from(photo) })
      return notFound(route, 'That photo no longer exists. It may have been replaced or removed.')
    }

    this.unhandled.push(`${method} ${path}`)
    return notFound(route, `The test API has no answer for ${method} ${path}.`)
  }
}

/**
 * Playwright's `test` with a mocked API installed on every page. `auto`, so
 * it's in place even for hooks and tests that never ask for `api`; otherwise
 * their requests would reach whatever real API is running.
 */
export const test = base.extend<{ api: MockApi }>({
  api: [
    // Playwright's fixture callback, named `provide` so lint doesn't mistake it for React's `use`.
    async ({ page }, provide) => {
      const api = new MockApi()
      await api.install(page)
      await provide(api)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
