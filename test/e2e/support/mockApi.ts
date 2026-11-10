import { test as base, type Page, type Route } from '@playwright/test'
import { defaultFeatures, type ApiErrorBody, type ClubSummary, type Features } from '@matchpoynt/shared'
import { FakeClubs } from './fakeClubs'
import { FakeSessions, type FakeResponse } from './fakeSessions'

/** What the mocked API answers with. Tests change it before (or between) page loads. */
export interface MockState {
  features: Features
}

/** A club as the API lists it, to seed with `api.clubs.seed(...)`. */
export function club(id: string, name: string, extra: Partial<ClubSummary> = {}): ClubSummary {
  const centred = { x: 50, y: 50, zoom: 1 }
  return { id, name, description: null, avatarUrl: null, coverUrl: null, avatarPosition: centred, coverPosition: centred, theme: null, members: 0, plannedSessions: 0, ...extra }
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

  constructor() {
    // Club badges show on the leaderboards of the sessions a club runs, and count their history.
    this.sessions.badgesFor = (clubId) => this.clubs.badgeViews(clubId)
    this.clubs.historyFor = (clubId) => this.sessions.history(clubId)
  }
  readonly unhandled: string[] = []

  async install(page: Page) {
    // Only the API itself: a `**/api/**` glob would also catch Vite's modules under src/utils/api/.
    await page.route((url) => url.pathname.startsWith('/api/'), (route) => this.handle(route))
  }

  private async handle(route: Route) {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const path = pathname.replace(/^\/api/, '')
    const method = request.method()

    if (method === 'GET' && path === '/config') return json(route, { features: this.state.features })
    if (method === 'GET' && path === '/auth/me') return json(route, { user: null })
    if (method === 'GET' && path === '/members/suggestions') return json(route, { suggestions: [] })
    if (method === 'GET' && path === '/gifs/search') {
      const params = new URL(request.url()).searchParams
      return json(route, this.clubs.search(params.get('q') ?? '', Number(params.get('offset') ?? 0)))
    }
    if (path === '/sessions' || path.startsWith('/sessions/')) {
      const search = new URL(request.url()).search
      const answer = this.sessions.handle(method, path === '/sessions/ended' && search ? `${path}${search}` : path, await request.allHeaders(), request.postData())
      if (answer) return reply(route, answer)
    }
    if (path === '/clubs' || path.startsWith('/clubs/')) {
      const answer = await this.clubs.handle(method, path, {
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
      const photo = this.clubs.photo(media[1]!)
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
