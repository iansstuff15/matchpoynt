import { randomUUID } from 'node:crypto'
import type { AccountLookupResponse, CurrentUser, NameCheckResponse, PhotoPosition, ProfilePageView, ProfileView, SocialLink } from '@matchpoynt/shared'
import { photoPositions } from '@matchpoynt/shared'
import { cleanPosition } from '@/utils/club/appearance'
import { checkImage, profileMediaPath } from '@/utils/club/media'
import { ApiError, conflict, invalid } from '@/utils/http/errors'
import { toWebp } from '@/utils/image/webp'
import { filterGames, pageOfGames, profileBadges, profileGames, profileRecord, profileStats, type MemberHistory } from '@/utils/profile/history'
import { manageClubsBlockedReason, runSessionsBlockedReason, assertValidProfile, missingFields, usernameTakenError, usernameTakenMessage } from '@/utils/profile/rules'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'
import { cleanSocialLinks } from '@/utils/social/links'
import { photoPositionSchema, profileGamesQuery, profileSchema, socialLinksSchema } from '@/utils/validation/schemas'
import type { FakeBody } from './fakeClubs'
import { parse, type FakeResponse } from './fakeSessions'

/** The account `signIn` signs in as (a Firebase-style UID). */
export const fakeAccountId = 'kZ3pQ8sT1vW4xY7aB0cD2eF5gH9j'

/** Someone else's account, as `POST /api/auth/lookup` would find it by email. */
export interface FakeAccount {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

/**
 * The signed-in person, their profile page and other accounts, in memory, for
 * UI tests. It runs the API's own profile rules, username and link checks,
 * photo check and WebP conversion, and the profile history and badge rules
 * (`utils/profile/history.ts`) over seeded club histories, as
 * `server/src/routes/profile.ts` and `routes/auth.ts` do.
 */
export class FakeProfile {
  /** Signed in as this person, or signed out (`null`). */
  user: { id: string; email: string } | null = null
  profile: ProfileView = { firstName: null, lastName: null, displayName: null, username: null, phone: null, city: null, role: null, termsAcceptedAt: null, sports: [] }
  avatarPath: string | null = null
  avatarPosition: PhotoPosition = { ...photoPositions.default }
  socialLinks: SocialLink[] = []
  /** Their clubs' histories, as my_club_history would give them. */
  histories: MemberHistory[] = []
  /** Other accounts by email, for the sign-in form's lookup. */
  readonly accounts = new Map<string, FakeAccount>()
  /** Usernames other accounts already have. */
  readonly takenUsernames = new Set<string>()
  /** Stored photos by path (served at /api/media/...). */
  media: Map<string, Uint8Array> = new Map()

  /** Signs in as a person with a complete profile. */
  signIn(email: string, profile: Partial<ProfileView> = {}) {
    this.user = { id: fakeAccountId, email }
    this.profile = {
      firstName: 'Ana',
      lastName: 'Reyes',
      displayName: 'ana.reyes',
      username: 'ana.reyes',
      phone: null,
      city: 'Manila',
      role: 'both',
      termsAcceptedAt: '2026-01-05T10:00:00Z',
      sports: [{ sportId: 'badminton', tierId: 'intermediate' }],
      ...profile,
    }
  }

  /** What forgot password was asked for, in order (email or username). */
  readonly resetRequests: string[] = []
  /** New sign-in emails asked for, in order. */
  readonly emailChanges: string[] = []

  me(): { user: CurrentUser | null } {
    if (!this.user) return { user: null }
    const missing = missingFields(this.profile)
    return {
      user: {
        id: this.user.id,
        email: this.user.email,
        displayName: this.profile.username ?? this.profile.displayName,
        username: this.profile.username,
        avatarUrl: this.avatarPath && `/api/media/${this.avatarPath}`,
        profileComplete: missing.length === 0,
        missing,
        role: this.profile.role,
        canManageClubs: manageClubsBlockedReason(this.profile.role, false) === null,
        canRunSessions: runSessionsBlockedReason(this.profile.role, false) === null,
      },
    }
  }

  usernameCheck(raw: string): NameCheckResponse {
    const value = normalizeHandle(raw)
    const problem = handleProblem(value, 'username')
    const taken = !problem && this.takenUsernames.has(value)
    return { value, available: !problem && !taken, reason: problem ?? (taken ? usernameTakenMessage(value) : null) }
  }

  /** By email, or by username (with or without the "@"), as POST /api/auth/lookup answers. */
  lookup(email: string): AccountLookupResponse {
    const typed = email.trim().toLowerCase()
    const found = this.accounts.get(typed) ?? [...this.accounts.values()].find((a) => a.username === typed.replace(/^@/, ''))
    return { account: found ? { ...found, avatarPosition: { ...photoPositions.default } } : null }
  }

  async handle(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    try {
      return await this.route(method, path, body)
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
      throw error
    }
  }

  private async route(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    const [pathname, search = ''] = path.split('?')
    if (!pathname!.startsWith('/profile')) return null
    if (!this.user) throw new ApiError('unauthorized', 'Sign in to see your profile.')
    const rest = pathname!.slice('/profile'.length)

    if (method === 'GET' && rest === '') {
      // The profile and what it's missing, as routes/profile.ts answers (the complete-profile form starts from it).
      const missing = missingFields(this.profile)
      return ok({ complete: missing.length === 0, missing, profile: this.profile, suggested: {} })
    }
    if (method === 'GET' && rest === '/page') {
      const games = profileGames(this.histories)
      const page: ProfilePageView = {
        profile: this.profile,
        email: this.user.email,
        avatarUrl: this.avatarPath && `/api/media/${this.avatarPath}`,
        avatarPosition: this.avatarPosition,
        socialLinks: this.socialLinks,
        memberSince: '2026-01-05T10:00:00Z',
        clubs: this.histories.map((h) => ({ id: h.clubId, name: h.clubName, handle: null, avatarUrl: null, avatarPosition: { ...photoPositions.default }, memberName: h.memberName })),
        stats: profileStats(this.histories, games),
        ...profileBadges(this.histories),
      }
      return ok(page)
    }
    if (method === 'GET' && rest === '/games') {
      const parsed = profileGamesQuery.safeParse(Object.fromEntries(new URLSearchParams(search)))
      if (!parsed.success) throw invalid('The games asked for are not valid. Reload the page.')
      const { before, ...filter } = parsed.data
      return ok(pageOfGames(filterGames(profileGames(this.histories), filter), before ?? null))
    }
    if (method === 'GET' && rest === '/record') return ok(profileRecord(this.histories))
    if (method === 'PUT' && rest === '') {
      const input = parse(profileSchema, body.text)
      assertValidProfile(input)
      if (this.takenUsernames.has(normalizeHandle(input.username))) throw usernameTakenError(input.username)
      this.profile = {
        ...this.profile,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        // The display name is the username, as save_profile stores it.
        displayName: normalizeHandle(input.username),
        username: normalizeHandle(input.username),
        phone: input.phone?.trim() || null,
        city: input.city?.trim() || null,
        role: input.role,
        sports: input.sports,
      }
      return ok({ complete: true, missing: [], profile: this.profile, suggested: {} })
    }
    if (method === 'PUT' && rest === '/avatar') {
      const file = (await body.form()).get('image')
      if (!(file instanceof File)) throw invalid('Choose a photo to upload.', { image: 'No file' })
      const bytes = new Uint8Array(await file.arrayBuffer())
      const path = profileMediaPath(this.user.id, randomUUID())
      this.media.set(path, await toWebp(bytes, checkImage(bytes)))
      if (this.avatarPath) this.media.delete(this.avatarPath)
      this.avatarPath = path
      this.avatarPosition = { ...photoPositions.default }
      return { status: 204 }
    }
    if (method === 'PUT' && rest === '/avatar/position') {
      if (!this.avatarPath) throw conflict('Upload a photo before aligning it.')
      this.avatarPosition = cleanPosition(parse(photoPositionSchema, body.text))
      return { status: 204 }
    }
    if (method === 'DELETE' && rest === '/avatar') {
      if (this.avatarPath) this.media.delete(this.avatarPath)
      this.avatarPath = null
      return { status: 204 }
    }
    if (method === 'PUT' && rest === '/social') {
      this.socialLinks = cleanSocialLinks(parse(socialLinksSchema, body.text).links)
      return { status: 204 }
    }
    return null
  }
}

const ok = (body: unknown): FakeResponse => ({ status: 200, body })
