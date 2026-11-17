import { addQrBlockedReason, cleanQrLabel, paymentQrViews, uploadedQrPosition, type StoredPaymentQr } from '@/utils/club/paymentQrs'
import { randomUUID } from 'node:crypto'
import type { ClubMemberRole, ClubBadgeInput, ClubBadgeView, ClubDirectoryResponse, ClubJoinCardView, ClubJoiningInput, ClubListResponse, ClubMembership, DirectoryClubView, JoinClubResponse, JoinRequestView, MemberTier, MyClubInvitesResponse, PeopleSearchResponse, PersonCard, PlayerClubPageView, SessionRequestView, SportId, ClubThemeInput, FeeScheme, NameCheckResponse, SavedClubTheme, SocialLink, PhotoPosition, ClubMemberInput, ClubMemberView, ClubSummary, ClubView, GifResult, GifSearchResponse } from '@matchpoynt/shared'
import { directoryLimits, gifSearch, pageSizes, photoPositions, signUpLimits, type UpcomingSessionView } from '@matchpoynt/shared'
import { cleanPosition, cleanTheme, positionOf, themeOf, withSavedTheme } from '@/utils/club/appearance'
import { addBadgeBlockedReason, badgeSummary, careerTotals, cleanBadge, memberCareerBadges, type ClubHistory } from '@/utils/club/badges'
import { cleanJoining } from '@/utils/club/joining'
import { signUpBlockedReason, spotsLeft } from '@/utils/club/signUp'
import { clubStandings } from '@/utils/club/standings'
import { careerKey } from '@/utils/club/badges'
import { checkBadgeIcon, checkImage, mediaPath, mediaUrl } from '@/utils/club/media'
import { addClubBlockedReason, addMemberBlockedReason, cleanClubInfo, cleanMember } from '@/utils/club/rules'
import { clubSetup } from '@/utils/club/setup'
import { cleanFee, feeSummary } from '@/utils/fees/rules'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'
import { cleanSocialLinks } from '@/utils/social/links'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import { toWebp } from '@/utils/image/webp'
import { badgeIconFromGifSchema, clubBadgeSchema, clubFeeSchema, clubImageKind, clubInfoSchema, clubMemberSchema, clubJoiningSchema, clubThemeSchema, createClubSchema, decisionSchema, inviteAnswerSchema, planSignUpSchema, sessionJoinSchema, photoPositionSchema, savedThemeSchema, socialLinksSchema } from '@/utils/validation/schemas'
import { parse, type FakeResponse } from './fakeSessions'

/** Who's asking, from the fake profile: their account, username and tiers. */
export interface FakeViewer {
  id: string
  username: string | null
  tiers: MemberTier[]
  avatarUrl: string | null
}

/** The guest every fake club belongs to (a UUID, as Storage paths need). */
const ownerId = '00000000-0000-4000-8000-000000000001'

interface StoredClub {
  id: string
  /** Run by the signed-in person (listed under /clubs); otherwise someone else's, found in the directory. */
  mine: boolean
  joining: ClubJoiningInput
  /** Account ids linked to roster members (club_members.user_id). */
  linked: Map<string, string>
  /** Pending requests to join, oldest first. */
  joinRequests: JoinRequestView[]
  /** In-app invites waiting for an account: invite id → member id and account. */
  appInvites: { id: string; memberId: string; userId: string; sentAt: string }[]
  sessionRequests: SessionRequestView[]
  name: string
  handle: string | null
  socialLinks: SocialLink[]
  description: string | null
  avatarPath: string | null
  coverPath: string | null
  avatarPosition: PhotoPosition
  coverPosition: PhotoPosition
  colors: ClubThemeInput | null
  savedThemes: SavedClubTheme[]
  paymentQrs: StoredPaymentQr[]
  fee: FeeScheme | null
  members: ClubMemberView[]
  badges: StoredBadge[]
  /** Planned sessions as members see them (seeded with `seedPlan`). */
  plans: SeededPlan[]
}

/** A planned session, with what members see of it. */
export interface SeededPlan {
  id: string
  title: string
  sportId: SportId
  /** ISO, or `null` before it has a date. */
  when: string | null
  signUp: 'approval' | 'open'
  maxPlayers: number | null
  memberIds: string[]
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
  /** The club's payment QR codes as players see them. */
  paymentQrsOf(clubId: string) {
    const club = this.clubs.get(clubId)
    return club ? paymentQrViews(club.paymentQrs) : []
  }

  /** The club's session history, from the fake sessions (for career badges). */
  historyFor: (clubId: string) => ClubHistory = () => ({ players: [], matches: [] })
  /** The sessions the club has run, for its page (from the fake sessions). */
  sessionsFor: (clubId: string) => ClubView['sessions'] = () => []
  /** GIF searches the fake GIPHY answered, newest last. */
  readonly gifQueries: string[] = []
  /** The signed-in person (from the fake profile); `null` signed out or in guest mode. */
  viewer: () => FakeViewer | null = () => null
  /** Other people on Matchpoynt, for the member search (`api.clubs.people.push(...)`). */
  readonly people: PersonCard[] = []
  /** The club's running sessions, and adding a member to one (from the fake sessions). */
  runningIn: (clubId: string) => { id: string; title: string; sportId: SportId; when: string; names: string[] }[] = () => []
  addToSession: (sessionId: string, member: ClubMemberView) => void = () => {}

  /** Adds a club before the page loads (for tests that start with clubs in place). `mine: false` makes it someone else's. Members are names, or a name with a role. */
  seed(summary: ClubSummary, options: { mine?: boolean; members?: (string | { name: string; role: ClubMemberRole })[] } = {}) {
    const club: StoredClub = { ...blank(summary.id, summary.name, summary.description), handle: summary.handle, fee: summary.fee, joining: summary.joining, mine: options.mine ?? true }
    club.members = (options.members ?? []).map((m) => ({
      id: randomUUID(),
      name: typeof m === 'string' ? m : m.name,
      role: typeof m === 'string' ? 'member' : m.role,
      contact: null,
      tiers: [],
      email: null,
      linked: false,
      invite: null,
      badges: [],
      username: null,
      avatarUrl: null,
    }))
    this.clubs.set(summary.id, club)
  }

  /** Someone else asks to join a club (as request_join_club would record it), for tests of the owner's side. */
  requestToJoin(clubId: string, person: { userId: string; name: string; username?: string; tiers?: MemberTier[] }) {
    const club = this.clubs.get(clubId)!
    club.joinRequests.push({ id: randomUUID(), userId: person.userId, name: person.name, username: person.username ?? null, avatarUrl: null, avatarPosition: positionOf(null), tiers: person.tiers ?? [], requestedAt: new Date().toISOString() })
  }

  /** Someone else's account linked to a club (and the views that answer with it), for tests that need a member. */
  memberIdOf(clubId: string, name: string): string {
    const member = this.clubs.get(clubId)?.members.find((m) => m.name === name)
    if (!member) throw new Error(`No member ${name} in ${clubId}`)
    return member.id
  }

  /** A member asks to join one of the club's running sessions (as request_join_session records it), for tests of the owner's side. */
  /** Plans a session for a club, as the owner's plan dialog would (`memberIds` are roster member ids). */
  seedPlan(clubId: string, plan: Partial<SeededPlan> & { title: string }): SeededPlan {
    const club = this.clubs.get(clubId)
    if (!club) throw new Error(`No club ${clubId}`)
    const seeded: SeededPlan = { id: randomUUID(), sportId: 'badminton', when: null, signUp: 'approval', maxPlayers: null, memberIds: [], ...plan }
    club.plans.push(seeded)
    return seeded
  }

  /** As my_upcoming_plans: plans the viewer is on that start within the reminder window, soonest first. */
  upcomingFor(viewerId: string): UpcomingSessionView[] {
    const now = Date.now()
    const until = now + signUpLimits.reminderWindowHours * 3_600_000
    return [...this.clubs.values()]
      .filter((c) => c.handle)
      .flatMap((c) => {
        const member = this.memberOf(c, viewerId)
        return member
          ? c.plans
              .filter((p) => p.when && Date.parse(p.when) >= now && Date.parse(p.when) <= until && p.memberIds.includes(member.id))
              .map((p) => ({ planId: p.id, title: p.title, sportId: p.sportId, when: p.when!, clubName: c.name, clubHandle: c.handle! }))
          : []
      })
      .sort((a, b) => a.when.localeCompare(b.when))
  }

  requestSession(clubId: string, memberName: string, sessionId: string) {
    const club = this.clubs.get(clubId)!
    const member = club.members.find((m) => m.name === memberName)!
    const session = this.runningIn(clubId).find((s) => s.id === sessionId)!
    club.sessionRequests.push({ id: randomUUID(), memberId: member.id, memberName, planId: null, sessionId, sessionLabel: session.title, requestedAt: new Date().toISOString() })
  }

  /** The club's owner invites an account in the app to one of its members (as createAppInvite does). */
  inviteInApp(clubId: string, memberName: string, userId: string) {
    const club = this.clubs.get(clubId)!
    const member = club.members.find((m) => m.name === memberName)!
    const sentAt = new Date().toISOString()
    member.invite = { status: 'pending', sentAt, via: 'app' }
    club.appInvites.push({ id: randomUUID(), memberId: member.id, userId, sentAt })
  }

  /** Pending requests and invites, for assertions. */
  pendingOf(clubId: string) {
    const club = this.clubs.get(clubId)!
    return { joinRequests: club.joinRequests, sessionRequests: club.sessionRequests, appInvites: club.appInvites }
  }

  /** `GET /api/people/search`: up to 5 people by name, email or @username, never the viewer or the club's linked members. */
  searchPeople(raw: string, clubId: string | null): PeopleSearchResponse {
    const q = raw.trim().replace(/^@/, '').toLowerCase()
    if (q.length < directoryLimits.searchMinLength) return { people: [] }
    const taken = new Set(clubId ? [...(this.clubs.get(clubId)?.linked.values() ?? [])] : [])
    const me = this.viewer()?.id
    const found = this.people.filter(
      (p) => p.userId !== me && !taken.has(p.userId) && [p.displayName, p.username, p.email].some((v) => v?.toLowerCase().includes(q)),
    )
    return { people: found.slice(0, directoryLimits.searchResults) }
  }

  /** The club's badges as leaderboards show them (for the fake sessions). */
  badgeViews(clubId: string): ClubBadgeView[] {
    const club = this.clubs.get(clubId)
    return club ? club.badges.map(badgeView) : []
  }

  /** `GET /api/clubs/handle-check`, as routes/clubs.ts answers it. */
  handleCheck(raw: string, clubId: string | null): NameCheckResponse {
    const value = normalizeHandle(raw)
    const problem = handleProblem(value, 'handle')
    const taken = !problem && this.handleTaken(value, clubId)
    return { value, available: !problem && !taken, reason: problem ?? (taken ? `@${value} is already another club's handle.` : null) }
  }

  private handleTaken(handle: string, clubId: string | null) {
    return [...this.clubs.values()].some((c) => c.handle === handle && c.id !== clubId)
  }

  /** Whether a club exists, for the fake accounting. */
  /** Makes the signed-in viewer a member of a club, linked to their account under their username (as joining does), with a role. */
  addViewer(clubId: string, role: ClubMemberRole = 'member') {
    const club = this.clubs.get(clubId)
    const viewer = this.viewer()
    if (!club || !viewer) throw new Error('Seed the club and sign someone in first')
    this.addLinkedMember(club, viewer.username ?? 'viewer', viewer)
    club.members.at(-1)!.role = role
  }

  /** A club's name and photo, for leaderboards and their images. */
  leaderboardClub(clubId: string): { name: string; avatarUrl: string | null } | null {
    const club = this.clubs.get(clubId)
    return club ? { name: club.name, avatarUrl: mediaUrl(club.avatarPath) } : null
  }

  /** Every club's id, for the fake player view. */
  ids(): string[] {
    return [...this.clubs.keys()]
  }

  has(clubId: string): boolean {
    return this.clubs.has(clubId)
  }

  /** The club behind a handle, with the viewer's name on its roster (`null` when they aren't a member), for the fake feedback. */
  memberAt(handle: string, userId: string): { clubId: string; memberName: string | null } | null {
    const club = this.byHandle(handle)
    return club ? { clubId: club.id, memberName: this.memberOf(club, userId)?.name ?? null } : null
  }

  /** The viewer's name on a club's roster (`null` when they aren't a member), and the club's name and handle, for the fake player view. */
  memberIn(clubId: string, userId: string): { memberName: string | null; club: { name: string; handle: string | null } } | null {
    const club = this.clubs.get(clubId)
    return club ? { memberName: this.memberOf(club, userId)?.name ?? null, club: { name: club.name, handle: club.handle } } : null
  }

  /** A club's name and roster, for the fake accounting's manual invoices. */
  rosterOf(clubId: string): { name: string; members: ClubMemberView[] } {
    const club = this.clubs.get(clubId)
    return { name: club?.name ?? '', members: club?.members ?? [] }
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

  /** `GET /api/public/clubs/:handle`: a club's join card, readable signed out. */
  joinCard(handle: string): FakeResponse {
    const club = this.byHandle(handle)
    if (!club) return { status: 404, body: notFound('No club has that handle. The link may be wrong, or the club changed its handle.').toBody('test-request') }
    const card = this.card(club)
    const view: ClubJoinCardView = { ...card, handle: club.handle! }
    return ok(view)
  }

  /** The directory, players' club pages, joining and invites (`/api/directory/...`), as routes/directory.ts answers. */
  async directory(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    try {
      return this.directoryRoute(method, path, body)
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
      throw error
    }
  }

  private directoryRoute(method: string, path: string, body: FakeBody): FakeResponse | null {
    const [pathname, search = ''] = path.split('?')
    const viewer = this.viewer()
    if (!viewer) throw new ApiError('unauthorized', 'Sign in to find clubs.')
    if (method === 'GET' && pathname === '/directory') {
      const params = new URLSearchParams(search)
      const q = (params.get('q') ?? '').trim().replace(/^@/, '').toLowerCase()
      const offset = Number(params.get('offset') ?? 0)
      // Newest first, as club_directory orders them: seeded clubs keep their order, reversed.
      const all = [...this.clubs.values()].reverse().filter((c) => c.handle && (!q || c.name.toLowerCase().includes(q) || c.handle.includes(q)))
      const page = all.slice(offset, offset + directoryLimits.pageSize)
      const response: ClubDirectoryResponse = { clubs: page.map((c) => this.card(c)), nextOffset: offset + page.length < all.length ? offset + page.length : null }
      return ok(response)
    }
    if (method === 'GET' && pathname === '/directory/invites') return ok(this.myInvites(viewer))
    // As my_member_clubs: the clubs the viewer owns or is a member of (linked to their account), by name.
    if (method === 'GET' && pathname === '/directory/mine') {
      const mine = [...this.clubs.values()].filter((c) => c.handle && (c.mine || this.memberOf(c, viewer.id))).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      return ok({ clubs: mine.map((c) => this.card(c)) })
    }
    const invite = /^\/directory\/invites\/([^/]+)$/.exec(pathname!)
    if (invite && method === 'POST') {
      const { accept } = parse(inviteAnswerSchema, body.text)
      const club = [...this.clubs.values()].find((c) => c.appInvites.some((i) => i.id === invite[1] && i.userId === viewer.id))
      if (!club) throw notFound('That invite is no longer open. The club may have cancelled it.')
      const open = club.appInvites.find((i) => i.id === invite[1])!
      club.appInvites = club.appInvites.filter((i) => i !== open)
      if (accept) this.link(club, open.memberId, viewer)
      return ok(this.myInvites(viewer))
    }
    const planRoute = /^\/directory\/([^/]+)\/plans\/([^/]+)\/(sign-up|attendees)$/.exec(pathname!)
    if (planRoute) {
      const club = this.byHandle(planRoute[1]!)
      if (!club) throw notFound('No club has that handle. The link may be wrong, or the club changed its handle.')
      const plan = club.plans.find((p) => p.id === planRoute[2])
      if (!plan) throw notFound('That session has started or was removed.')
      const member = this.memberOf(club, viewer.id)
      if (!member) throw new ApiError('forbidden', 'Join the club to sign up for its sessions.')
      if (planRoute[3] === 'attendees') {
        const names = club.members.filter((x) => plan.memberIds.includes(x.id)).map((x) => x.name).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        return ok({ names, spotsLeft: spotsLeft(plan.maxPlayers, plan.memberIds.length) })
      }
      // As routes/directory.ts and sign_up_for_plan.
      const { going } = parse(planSignUpSchema, body.text)
      const joined = plan.memberIds.includes(member.id)
      const blocked = signUpBlockedReason({ signUp: plan.signUp, maxPlayers: plan.maxPlayers, players: plan.memberIds.length, when: plan.when, joined }, going, Date.now())
      if (blocked) throw conflict(blocked)
      plan.memberIds = going ? [...plan.memberIds, member.id] : plan.memberIds.filter((id) => id !== member.id)
      return ok(this.playerPage(club, viewer))
    }
    const m = /^\/directory\/([^/]+)(\/join|\/sessions)?$/.exec(pathname!)
    if (!m) return null
    const club = this.byHandle(m[1]!)
    if (!club) throw notFound('No club has that handle. The link may be wrong, or the club changed its handle.')
    if (method === 'GET' && !m[2]) return ok(this.playerPage(club, viewer))
    if (method === 'POST' && m[2] === '/join') {
      // As request_join_club: an open invite links them; auto approval adds them; otherwise the request waits.
      let status: JoinClubResponse['status'] = 'requested'
      const invited = club.appInvites.find((i) => i.userId === viewer.id)
      if (club.mine || this.memberOf(club, viewer.id)) status = 'joined'
      else if (invited) {
        club.appInvites = club.appInvites.filter((i) => i !== invited)
        this.link(club, invited.memberId, viewer)
        status = 'joined'
      } else if (club.joining.approval === 'auto') {
        this.addLinkedMember(club, viewer.username ?? 'Player', viewer)
        status = 'joined'
      } else if (!club.joinRequests.some((r) => r.userId === viewer.id)) {
        club.joinRequests.push({ id: randomUUID(), userId: viewer.id, name: viewer.username ?? 'Player', username: viewer.username, avatarUrl: viewer.avatarUrl, avatarPosition: positionOf(null), tiers: viewer.tiers, requestedAt: new Date().toISOString() })
      }
      const response: JoinClubResponse = { status, page: this.playerPage(club, viewer) }
      return ok(response)
    }
    if (method === 'POST' && m[2] === '/sessions') {
      const { planId, sessionId } = parse(sessionJoinSchema, body.text)
      const member = this.memberOf(club, viewer.id)
      if (!member) throw new ApiError('forbidden', 'Only members can ask to join its sessions. Join the club first.')
      const running = this.runningIn(club.id).find((s) => s.id === sessionId)
      if (planId || !running) throw conflict("That session isn't open to join any more. It may have ended or been removed.")
      if (!club.sessionRequests.some((r) => r.memberId === member.id && r.sessionId === running.id)) {
        club.sessionRequests.push({ id: randomUUID(), memberId: member.id, memberName: member.name, planId: null, sessionId: running.id, sessionLabel: running.title, requestedAt: new Date().toISOString() })
      }
      return ok(this.playerPage(club, viewer))
    }
    return null
  }

  private byHandle(handle: string) {
    const h = handle.replace(/^@/, '').toLowerCase()
    return [...this.clubs.values()].find((c) => c.handle === h) ?? null
  }

  private memberOf(club: StoredClub, userId: string) {
    const memberId = [...club.linked.entries()].find(([, u]) => u === userId)?.[0]
    return club.members.find((m) => m.id === memberId) ?? null
  }

  private membership(club: StoredClub, userId: string | undefined): ClubMembership {
    if (club.mine) return 'owner'
    if (!userId) return 'none'
    if (this.memberOf(club, userId)) return 'member'
    if (club.appInvites.some((i) => i.userId === userId)) return 'invited'
    return club.joinRequests.some((r) => r.userId === userId) ? 'requested' : 'none'
  }

  private card(club: StoredClub): DirectoryClubView {
    return {
      id: club.id,
      name: club.name,
      handle: club.handle,
      description: club.description,
      avatarUrl: mediaUrl(club.avatarPath),
      avatarPosition: club.avatarPosition,
      coverUrl: mediaUrl(club.coverPath),
      coverPosition: club.coverPosition,
      members: club.members.length,
      approval: club.joining.approval,
      membership: this.membership(club, this.viewer()?.id),
      theme: themeOf(club.colors),
    }
  }

  private link(club: StoredClub, memberId: string, viewer: FakeViewer) {
    club.linked.set(memberId, viewer.id)
    const member = club.members.find((m) => m.id === memberId)
    if (member) Object.assign(member, { linked: true, invite: null, username: viewer.username, avatarUrl: viewer.avatarUrl })
  }

  private addLinkedMember(club: StoredClub, name: string, viewer: { id: string; username: string | null; tiers: MemberTier[]; avatarUrl: string | null }) {
    const member: ClubMemberView = { id: randomUUID(), name, role: 'member', contact: null, tiers: viewer.tiers, email: null, linked: true, invite: null, badges: [], username: viewer.username, avatarUrl: viewer.avatarUrl }
    club.members.push(member)
    club.linked.set(member.id, viewer.id)
  }

  private myInvites(viewer: FakeViewer): MyClubInvitesResponse {
    return {
      invites: [...this.clubs.values()].flatMap((c) => c.appInvites.filter((i) => i.userId === viewer.id).map((i) => ({ id: i.id, sentAt: i.sentAt, club: this.card(c) }))),
    }
  }

  private playerPage(club: StoredClub, viewer: FakeViewer): PlayerClubPageView {
    const member = this.memberOf(club, viewer.id)
    const inside = club.mine || member !== null
    return {
      club: { ...this.card(club), socialLinks: club.socialLinks, fee: club.fee, feeSummary: club.fee && feeSummary(club.fee), theme: themeOf(club.colors) },
      memberId: member?.id ?? null,
      myRole: member?.role ?? null,
      team: club.members
        .filter((m) => m.role !== 'member')
        .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, role: m.role, username: m.username, avatarUrl: m.avatarUrl })),
      welcome: inside ? { message: club.joining.welcomeMessage, links: club.joining.welcomeLinks } : null,
      inviteId: club.appInvites.find((i) => i.userId === viewer.id)?.id ?? null,
      sessions: [
        ...this.runningIn(club.id).map((s) => ({
        id: s.id,
        kind: 'active' as const,
        title: s.title,
        sportId: s.sportId,
        when: s.when,
        players: s.names.length,
        joined: Boolean(member && s.names.some((n) => careerKey(n) === careerKey(member.name))),
        requested: Boolean(member && club.sessionRequests.some((r) => r.memberId === member.id && r.sessionId === s.id)),
        signUp: null,
        spotsLeft: null,
        signUpBlockedReason: null,
      })),
        ...club.plans.map((p) => {
          const joined = Boolean(member && p.memberIds.includes(member.id))
          const plan = { signUp: p.signUp, maxPlayers: p.maxPlayers, players: p.memberIds.length, when: p.when, joined }
          return {
            id: p.id,
            kind: 'planned' as const,
            title: p.title,
            sportId: p.sportId,
            when: p.when,
            players: p.memberIds.length,
            joined,
            requested: Boolean(member && club.sessionRequests.some((r) => r.memberId === member.id && r.planId === p.id)),
            signUp: p.signUp,
            spotsLeft: spotsLeft(p.maxPlayers, p.memberIds.length),
            signUpBlockedReason: member ? signUpBlockedReason(plan, !joined, Date.now()) : null,
          }
        }),
      ],
      badges: club.badges.map(badgeView),
      leaderboard: clubStandings(this.historyFor(club.id), directoryLimits.leaderboard),
    }
  }

  private async route(method: string, path: string, body: FakeBody): Promise<FakeResponse | null> {
    if (path === '/clubs' || path.startsWith('/clubs?')) {
      if (method === 'GET') {
        // The account's own clubs, a page at a time, as listClubs answers.
        const offset = Number(new URLSearchParams(path.split('?')[1] ?? '').get('offset') ?? 0)
        const mine = [...this.clubs.values()].filter((c) => c.mine).sort((a, b) => a.name.localeCompare(b.name))
        const page = mine.slice(offset, offset + pageSizes.clubs)
        return ok({ clubs: page.map(summary), nextOffset: offset + page.length < mine.length ? offset + page.length : null } satisfies ClubListResponse)
      }
      if (method === 'POST') {
        // The step-by-step form sends colours and a fee too, as routes/clubs.ts takes them.
        const input = parse(createClubSchema, body.text)
        const info = cleanClubInfo(input)
        const colors = input.theme ? cleanTheme(input.theme) : null
        const fee = cleanFee(input.fee)
        const blocked = addClubBlockedReason([...this.clubs.values()].filter((c) => c.mine).length)
        if (blocked) throw conflict(blocked)
        if (this.handleTaken(info.handle, null)) throw new ApiError('conflict', `@${info.handle} is already another club's handle. Pick another.`, { handle: 'Taken' })
        const club: StoredClub = { ...blank(randomUUID(), info.name, info.description), handle: info.handle, colors: colors && (colors.accent || colors.sidebar || colors.page) ? colors : null, fee }
        this.clubs.set(club.id, club)
        return { status: 201, body: this.view(club) }
      }
    }

    const match = /^\/clubs\/([^/]+)(\/.*)?$/.exec(path)
    if (!match) return null
    const club = this.clubs.get(match[1]!)
    if (!club || !club.mine) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
    const rest = match[2] ?? ''

    if (rest === '') {
      if (method === 'GET') return ok(this.view(club))
      if (method === 'PUT') {
        const info = cleanClubInfo(parse(clubInfoSchema, body.text))
        if (this.handleTaken(info.handle, club.id)) throw new ApiError('conflict', `@${info.handle} is already another club's handle. Pick another.`, { handle: 'Taken' })
        Object.assign(club, info)
        return ok(this.view(club))
      }
      if (method === 'DELETE') {
        for (const p of [club.avatarPath, club.coverPath, ...club.badges.map((b) => b.iconPath)]) if (p) this.media.delete(p)
        this.clubs.delete(club.id)
        return { status: 204 }
      }
    }

    // As routes/clubs.ts: payment QR codes, stored lossless.
    if (rest === '/payment-qrs' && method === 'POST') {
      const blocked = addQrBlockedReason(club.paymentQrs.length)
      if (blocked) throw conflict(blocked)
      const form = await body.form().catch(() => {
        throw invalid('The upload was not a valid form. Choose the photo again.')
      })
      const label = cleanQrLabel(String(form.get('label') ?? ''))
      const position = uploadedQrPosition(form.get('position') ?? undefined, cleanPosition)
      const file = form.get('image')
      if (!(file instanceof File)) throw invalid('Choose a photo to upload.', { image: 'No file' })
      const bytes = new Uint8Array(await file.arrayBuffer())
      const stored = mediaPath(ownerId, club.id, 'qr', randomUUID())
      this.media.set(stored, await toWebp(bytes, checkImage(bytes), { lossless: true }))
      club.paymentQrs = [...club.paymentQrs, { id: randomUUID(), label, path: stored, position }]
      return ok(this.view(club))
    }
    const qrFrame = /^\/payment-qrs\/([^/]+)\/position$/.exec(rest)
    if (qrFrame && method === 'PUT') {
      const qr = club.paymentQrs.find((q) => q.id === qrFrame[1])
      if (!qr) throw notFound('That QR code is no longer on the club. It may have been removed on another device.')
      qr.position = cleanPosition(parse(photoPositionSchema, body.text))
      return ok(this.view(club))
    }
    const qr = /^\/payment-qrs\/([^/]+)$/.exec(rest)
    if (qr && method === 'DELETE') {
      const gone = club.paymentQrs.find((q) => q.id === qr[1])
      if (!gone) throw notFound('That QR code is no longer on the club. It may have been removed on another device.')
      this.media.delete(gone.path)
      club.paymentQrs = club.paymentQrs.filter((q) => q !== gone)
      return ok(this.view(club))
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
      club.colors = colors.accent || colors.sidebar || colors.page ? colors : null
      return ok(this.view(club))
    }
    if (rest === '/themes' && method === 'POST') {
      club.savedThemes = withSavedTheme(club.savedThemes, parse(savedThemeSchema, body.text), randomUUID())
      return ok(this.view(club))
    }
    const savedTheme = /^\/themes\/([^/]+)$/.exec(rest)
    if (savedTheme && method === 'DELETE') {
      if (!club.savedThemes.some((t) => t.id === savedTheme[1])) throw notFound('That theme is no longer saved. It may have been deleted on another device.')
      club.savedThemes = club.savedThemes.filter((t) => t.id !== savedTheme[1])
      return ok(this.view(club))
    }

    if (rest === '/social' && method === 'PUT') {
      club.socialLinks = cleanSocialLinks(parse(socialLinksSchema, body.text).links)
      return ok(this.view(club))
    }
    if (rest === '/joining' && method === 'PUT') {
      club.joining = cleanJoining(parse(clubJoiningSchema, body.text))
      return ok(this.view(club))
    }
    const decision = /^\/(requests|session-requests)\/([^/]+)$/.exec(rest)
    if (decision && method === 'POST') {
      const { approve } = parse(decisionSchema, body.text)
      const gone = () => notFound('That request is no longer open. It may have been decided on another device.')
      if (decision[1] === 'requests') {
        const request = club.joinRequests.find((r) => r.id === decision[2])
        if (!request) throw gone()
        // Approving adds them to the roster under their username, linked, with their tiers.
        if (approve) this.addLinkedMember(club, request.name, { id: request.userId, username: request.username, tiers: request.tiers, avatarUrl: request.avatarUrl })
        club.joinRequests = club.joinRequests.filter((r) => r !== request)
      } else {
        const request = club.sessionRequests.find((r) => r.id === decision[2])
        if (!request) throw gone()
        const member = club.members.find((m) => m.id === request.memberId)
        if (approve && member && request.sessionId) this.addToSession(request.sessionId, member)
        club.sessionRequests = club.sessionRequests.filter((r) => r !== request)
      }
      return ok(this.view(club))
    }
    if (rest.startsWith('/sessions') && method === 'GET') {
      // The first page comes with the club view; nothing older in these tests.
      return ok({ sessions: [], nextBefore: null })
    }
    if (rest === '/fee' && method === 'PUT') {
      club.fee = cleanFee(parse(clubFeeSchema, body.text).fee)
      return ok(this.view(club))
    }

    if (rest === '/members' && method === 'POST') {
      const input = parse(clubMemberSchema, body.text) as ClubMemberInput
      const member = cleanMember(input)
      const blocked = addMemberBlockedReason(club.members.length)
      if (blocked) throw conflict(blocked)
      const id = randomUUID()
      // Picked from the people search: they're invited in the app, as createAppInvite does.
      const sentAt = new Date().toISOString()
      club.members.push({ id, ...member, role: member.role ?? 'member', email: null, linked: false, invite: input.userId ? { status: 'pending', sentAt, via: 'app' } : null, badges: [], username: null, avatarUrl: null })
      if (input.userId) club.appInvites.push({ id: randomUUID(), memberId: id, userId: input.userId, sentAt })
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
    const view = {
      club: summary(club),
      members: [...club.members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({ ...m, badges: memberCareerBadges(m.name, badges, career) })),
      planned: [],
      sessions: this.sessionsFor(club.id),
      badges,
      joinRequests: club.joinRequests,
      sessionRequests: club.sessionRequests,
      sessionsNextBefore: null,
    }
    return { ...view, setup: clubSetup(view, true) }
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
  mine: true,
  joining: { approval: 'manual', welcomeMessage: null, welcomeLinks: [] },
  linked: new Map(),
  joinRequests: [],
  appInvites: [],
  sessionRequests: [],
  plans: [],
  name,
  description,
  avatarPath: null,
  coverPath: null,
  avatarPosition: positionOf(null),
  coverPosition: positionOf(null),
  handle: null,
  socialLinks: [],
  colors: null,
  savedThemes: [],
  paymentQrs: [],
  fee: null,
  members: [],
  badges: [],
})

const summary = (club: StoredClub): ClubSummary => ({
  id: club.id,
  name: club.name,
  handle: club.handle,
  socialLinks: club.socialLinks,
  description: club.description,
  avatarUrl: mediaUrl(club.avatarPath),
  coverUrl: mediaUrl(club.coverPath),
  avatarPosition: club.avatarPosition,
  coverPosition: club.coverPosition,
  theme: themeOf(club.colors),
  savedThemes: club.savedThemes,
  paymentQrs: paymentQrViews(club.paymentQrs),
  fee: club.fee,
  feeSummary: club.fee && feeSummary(club.fee),
  members: club.members.length,
  plannedSessions: 0,
  joining: club.joining,
})
