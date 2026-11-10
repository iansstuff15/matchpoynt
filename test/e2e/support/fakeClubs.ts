import { randomUUID } from 'node:crypto'
import type { ClubBadgeInput, ClubBadgeView, ClubListResponse, ClubThemeInput, PhotoPosition, ClubMemberInput, ClubMemberView, ClubSummary, ClubView, GifResult, GifSearchResponse } from '@matchpoynt/shared'
import { gifSearch, photoPositions } from '@matchpoynt/shared'
import { cleanPosition, cleanTheme, positionOf, themeOf } from '@/utils/club/appearance'
import { addBadgeBlockedReason, badgeSummary, careerTotals, cleanBadge, memberCareerBadges, type ClubHistory } from '@/utils/club/badges'
import { checkBadgeIcon, checkImage, mediaPath, mediaUrl } from '@/utils/club/media'
import { addClubBlockedReason, addMemberBlockedReason, cleanClubInfo, cleanMember } from '@/utils/club/rules'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import { toWebp } from '@/utils/image/webp'
import { badgeIconFromGifSchema, clubBadgeSchema, clubImageKind, clubInfoSchema, clubMemberSchema, clubThemeSchema, photoPositionSchema } from '@/utils/validation/schemas'
import { parse, type FakeResponse } from './fakeSessions'

/** The guest every fake club belongs to (a UUID, as Storage paths need). */
const ownerId = '00000000-0000-4000-8000-000000000001'

interface StoredClub {
  id: string
  name: string
  description: string | null
  avatarPath: string | null
  coverPath: string | null
  avatarPosition: PhotoPosition
  coverPosition: PhotoPosition
  colors: ClubThemeInput | null
  members: ClubMemberView[]
  badges: StoredBadge[]
}

interface StoredBadge extends ClubBadgeInput {
  id: string
  iconPath: string | null
  iconSource: 'upload' | 'giphy' | null
}

/** A tiny real GIF (1×1, one colour per id), standing in for GIPHY's files. */
export function fakeGif(seed: number): Uint8Array {
  const [r, g, b] = [(seed * 67) % 256, (seed * 131) % 256, (seed * 29) % 256]
  return new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, r, g, b, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0, 0x3b,
  ])
}

/** What the fake GIF search finds: a handful of named GIFs, served from `/api/media/giphy/<id>.gif`. */
export const fakeGifs: GifResult[] = ['trophy', 'smash', 'champion', 'fire', 'crown', 'rocket'].map((word, i) => ({
  id: `fake${word}${i}`,
  title: `${word[0]!.toUpperCase()}${word.slice(1)} GIF`,
  previewUrl: `/api/media/giphy/fake${word}${i}.gif`,
  width: 200,
  height: 200,
}))

/** What the request carries: JSON text, or the multipart form of a photo upload. */
export interface FakeBody {
  text: string | null
  form: () => Promise<FormData>
}

/**
 * The club part of the API, in memory, for UI tests. It runs the API's real
 * club rules (`server/src/utils/club/rules.ts`), the same validation schemas,
 * the real photo check (`checkImage`: size and the file's actual bytes) and
 * the real WebP conversion (`toWebp`), as `server/src/routes/clubs.ts` does.
 * Photos are kept in memory and served at `/api/media/...` like the media route.
 */
export class FakeClubs {
  private readonly clubs = new Map<string, StoredClub>()
  /** Stored photos by path, as WebP (badge icons may be GIFs). */
  readonly media = new Map<string, Uint8Array>()
  /** The club's session history, from the fake sessions (for career badges). */
  historyFor: (clubId: string) => ClubHistory = () => ({ players: [], matches: [] })
  /** GIF searches the fake GIPHY answered, newest last. */
  readonly gifQueries: string[] = []

  /** Adds a club before the page loads (for tests that start with clubs in place). */
  seed(summary: ClubSummary) {
    this.clubs.set(summary.id, { ...blank(summary.id, summary.name, summary.description) })
  }

  /** The club's badges as leaderboards show them (for the fake sessions). */
  badgeViews(clubId: string): ClubBadgeView[] {
    const club = this.clubs.get(clubId)
    return club ? club.badges.map(badgeView) : []
  }

  /** The id of a club by name, for tests that start a session in it. */
  idOf(name: string): string {
    const club = [...this.clubs.values()].find((c) => c.name === name)
    if (!club) throw new Error(`No fake club called ${name}`)
    return club.id
  }

  async handle(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    try {
      return await this.route(method, path, body)
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
      throw error
    }
  }

  /** A stored photo, for `GET /api/media/<path>` (fake GIPHY previews included). */
  photo(path: string): Uint8Array | null {
    const giphy = /^giphy\/(.+)\.gif$/.exec(path)
    if (giphy) {
      const i = fakeGifs.findIndex((g) => g.id === giphy[1])
      return i >= 0 ? fakeGif(i + 1) : null
    }
    return this.media.get(path) ?? null
  }

  /** The fake GIPHY search: every fake GIF whose title contains a word of the query. */
  search(query: string, offset: number): GifSearchResponse {
    this.gifQueries.push(query)
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const hits = fakeGifs.filter((g) => words.some((w) => g.title.toLowerCase().includes(w)))
    return { results: hits.slice(offset, offset + gifSearch.pageSize), nextOffset: null, attribution: gifSearch.attribution }
  }

  private async route(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    if (path === '/clubs') {
      if (method === 'GET') return ok({ clubs: [...this.clubs.values()].map(summary) } satisfies ClubListResponse)
      if (method === 'POST') {
        const info = cleanClubInfo(parse(clubInfoSchema, body.text))
        const blocked = addClubBlockedReason(this.clubs.size)
        if (blocked) throw conflict(blocked)
        const club: StoredClub = blank(randomUUID(), info.name, info.description)
        this.clubs.set(club.id, club)
        return { status: 201, body: this.view(club) }
      }
    }

    const match = /^\/clubs\/([^/]+)(\/.*)?$/.exec(path)
    if (!match) return null
    const club = this.clubs.get(match[1]!)
    if (!club) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
    const rest = match[2] ?? ''

    if (rest === '') {
      if (method === 'GET') return ok(this.view(club))
      if (method === 'PUT') {
        Object.assign(club, cleanClubInfo(parse(clubInfoSchema, body.text)))
        return ok(this.view(club))
      }
      if (method === 'DELETE') {
        for (const p of [club.avatarPath, club.coverPath, ...club.badges.map((b) => b.iconPath)]) if (p) this.media.delete(p)
        this.clubs.delete(club.id)
        return { status: 204 }
      }
    }

    const photo = /^\/(avatar|cover)$/.exec(rest)
    if (photo) {
      const kind = clubImageKind.parse(photo[1])
      const column = kind === 'avatar' ? 'avatarPath' : 'coverPath'
      if (method === 'PUT') {
        const file = (await body.form().catch(() => {
          throw invalid('The upload was not a valid form. Choose the photo again.')
        })).get('image')
        if (!(file instanceof File)) throw invalid('Choose a photo to upload.', { image: 'No file' })
        const bytes = new Uint8Array(await file.arrayBuffer())
        // Stored as WebP whatever was uploaded, after the API's own checks.
        const webp = await toWebp(bytes, checkImage(bytes))
        const stored = mediaPath(ownerId, club.id, kind, randomUUID())
        this.media.set(stored, webp)
        if (club[column]) this.media.delete(club[column])
        club[column] = stored
        // A new photo starts centred, as setClubImage does.
        club[kind === 'avatar' ? 'avatarPosition' : 'coverPosition'] = { ...photoPositions.default }
        return ok(this.view(club))
      }
      if (method === 'DELETE') {
        if (club[column]) this.media.delete(club[column])
        club[column] = null
        return ok(this.view(club))
      }
    }

    const align = /^\/(avatar|cover)\/position$/.exec(rest)
    if (align && method === 'PUT') {
      const kind = clubImageKind.parse(align[1])
      if (!club[kind === 'avatar' ? 'avatarPath' : 'coverPath']) throw conflict('Upload a photo before aligning it.')
      club[kind === 'avatar' ? 'avatarPosition' : 'coverPosition'] = cleanPosition(parse(photoPositionSchema, body.text))
      return ok(this.view(club))
    }
    if (rest === '/theme' && method === 'PUT') {
      const colors = cleanTheme(parse(clubThemeSchema, body.text))
      club.colors = colors.accent || colors.sidebar ? colors : null
      return ok(this.view(club))
    }

    if (rest === '/members' && method === 'POST') {
      const member = cleanMember(parse(clubMemberSchema, body.text) as ClubMemberInput)
      const blocked = addMemberBlockedReason(club.members.length)
      if (blocked) throw conflict(blocked)
      club.members.push({ id: randomUUID(), ...member, email: null, linked: false, invite: null, badges: [] })
      return ok(this.view(club))
    }
    const memberMatch = /^\/members\/([^/]+)$/.exec(rest)
    if (memberMatch) {
      const index = club.members.findIndex((m) => m.id === memberMatch[1])
      if (index < 0) throw notFound('That member is no longer in the club.')
      if (method === 'PUT') {
        club.members[index] = { ...club.members[index]!, ...cleanMember(parse(clubMemberSchema, body.text) as ClubMemberInput) }
        return ok(this.view(club))
      }
      if (method === 'DELETE') {
        club.members.splice(index, 1)
        return ok(this.view(club))
      }
    }
    // Badges, as routes/clubs.ts: the API's own checks, summary and award rules.
    if (rest === '/badges' && method === 'POST') {
      const badge = cleanBadge(parse(clubBadgeSchema, body.text))
      const blocked = addBadgeBlockedReason(club.badges.length)
      if (blocked) throw conflict(blocked)
      club.badges.push({ id: randomUUID(), ...badge, iconPath: null, iconSource: null })
      return ok(this.view(club))
    }
    const badgeMatch = /^\/badges\/([^/]+)(\/icon(\/gif)?)?$/.exec(rest)
    if (badgeMatch) {
      const badge = club.badges.find((b) => b.id === badgeMatch[1])
      if (!badge) throw notFound('That badge no longer exists. It may have been deleted on another device.')
      const icon = badgeMatch[2]
      const setIcon = (bytes: Uint8Array, type: 'image/gif' | 'image/webp', source: 'upload' | 'giphy') => {
        const stored = mediaPath(ownerId, club.id, 'badge', randomUUID(), type)
        this.media.set(stored, bytes)
        if (badge.iconPath) this.media.delete(badge.iconPath)
        badge.iconPath = stored
        badge.iconSource = source
      }
      if (!icon && method === 'PUT') {
        Object.assign(badge, cleanBadge(parse(clubBadgeSchema, body.text)))
        return ok(this.view(club))
      }
      if (!icon && method === 'DELETE') {
        if (badge.iconPath) this.media.delete(badge.iconPath)
        club.badges = club.badges.filter((b) => b !== badge)
        return ok(this.view(club))
      }
      if (icon === '/icon' && method === 'PUT') {
        const file = (await body.form()).get('image')
        if (!(file instanceof File)) throw invalid('Choose an image or GIF for the badge.', { icon: 'No file' })
        const bytes = new Uint8Array(await file.arrayBuffer())
        const type = checkBadgeIcon(bytes)
        if (type === 'image/gif') setIcon(bytes, 'image/gif', 'upload')
        else setIcon(await toWebp(bytes, type), 'image/webp', 'upload')
        return ok(this.view(club))
      }
      if (icon === '/icon/gif' && method === 'POST') {
        const { gifId } = parse(badgeIconFromGifSchema, body.text)
        const i = fakeGifs.findIndex((g) => g.id === gifId)
        if (i < 0) throw notFound('That GIF is no longer on GIPHY. Pick another.')
        const bytes = fakeGif(i + 1)
        checkBadgeIcon(bytes)
        setIcon(bytes, 'image/gif', 'giphy')
        return ok(this.view(club))
      }
      if (icon === '/icon' && method === 'DELETE') {
        if (badge.iconPath) this.media.delete(badge.iconPath)
        badge.iconPath = null
        badge.iconSource = null
        return ok(this.view(club))
      }
    }
    return null
  }

  /** Everything the club page shows, as `clubView` in the clubs route builds it. */
  private view(club: StoredClub): ClubView {
    const badges = club.badges.map(badgeView)
    const career = careerTotals(this.historyFor(club.id))
    return {
      club: summary(club),
      members: [...club.members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({ ...m, badges: memberCareerBadges(m.name, badges, career) })),
      planned: [],
      sessions: [],
      badges,
    }
  }
}

const badgeView = (b: StoredBadge): ClubBadgeView => ({
  id: b.id,
  name: b.name,
  description: b.description,
  scope: b.scope,
  conditions: b.conditions,
  iconUrl: mediaUrl(b.iconPath),
  iconSource: b.iconSource,
  summary: badgeSummary(b),
})

const ok = (body: unknown): FakeResponse => ({ status: 200, body })

/** A new club with nothing set, as the API stores it. */
const blank = (id: string, name: string, description: string | null): StoredClub => ({
  id,
  name,
  description,
  avatarPath: null,
  coverPath: null,
  avatarPosition: positionOf(null),
  coverPosition: positionOf(null),
  colors: null,
  members: [],
  badges: [],
})

const summary = (club: StoredClub): ClubSummary => ({
  id: club.id,
  name: club.name,
  description: club.description,
  avatarUrl: mediaUrl(club.avatarPath),
  coverUrl: mediaUrl(club.coverPath),
  avatarPosition: club.avatarPosition,
  coverPosition: club.coverPosition,
  theme: themeOf(club.colors),
  members: club.members.length,
  plannedSessions: 0,
})
