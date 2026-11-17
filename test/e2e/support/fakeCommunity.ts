import { playerPayment } from '@/utils/fees/playerPayment'
import { randomUUID } from 'node:crypto'
import { feedbackLimits, type FeedbackAnswer, type FeedbackFormInput, type MemberFeedbackView, type PersonCard, type PersonProfileView, type PlayerLiveListResponse, type SportId } from '@matchpoynt/shared'
import type { SessionState } from '@/interfaces/SessionState'
import { addAnnouncementBlockedReason, announcementsView, announcementView, cleanAnnouncement, pinBlockedReason, sortAnnouncements, type AnnouncementRecord } from '@/utils/club/announcements'
import { careerKey, careerTotals } from '@/utils/club/badges'
import { cleanAnswers, cleanFeedbackForm, feedbackResults, feedbackSessionLabel, formOf, type FeedbackFormRecord } from '@/utils/club/feedback'
import { answerBlockedReason, friendRequestBlockedReason, friendsView, requestAction, withFriendStatus, type FriendshipRecord } from '@/utils/friends/rules'
import { ApiError, conflict, notFound } from '@/utils/http/errors'
import { settleCheckIns } from '@/utils/session/engine'
import { leaderboardView } from '@/utils/session/leaderboardView'
import { playerLiveView } from '@/utils/session/playerView'
import { announcementSchema, breakSchema, feedbackFormSchema, feedbackSubmitSchema, friendRequestSchema, inviteAnswerSchema } from '@/utils/validation/schemas'
import type { FakeClubs } from './fakeClubs'
import { parse, type FakeResponse, type FakeSessions } from './fakeSessions'

// Club feedback, friends and the players' live view, in memory, on the API's
// real rules (utils/club/feedback.ts, utils/friends/rules.ts,
// utils/session/playerView.ts) and schemas, answering as routes/clubs.ts,
// routes/directory.ts, routes/friends.ts and routes/play.ts do.

const ok = (body: unknown): FakeResponse => ({ status: 200, body })
const fail = (error: unknown): FakeResponse => {
  if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
  throw error
}
const inWindow = (endedAt: string | null) => endedAt !== null && Date.now() - Date.parse(endedAt) < feedbackLimits.answerWindowDays * 86_400_000
const onRoster = (state: SessionState, name: string) => Object.values(state.players).some((p) => careerKey(p.name) === careerKey(name))

interface StoredResponse {
  sessionId: string
  userId: string
  memberName: string
  answers: FeedbackAnswer[]
  createdAt: string
}

export class FakeCommunity {
  /** Each club's saved feedback form (none until the owner saves one). */
  private readonly forms = new Map<string, FeedbackFormRecord>()
  private readonly responses: StoredResponse[] = []
  /** Each club's announcements. */
  private readonly announcements = new Map<string, AnnouncementRecord[]>()
  /** Friendships, both ways: requester, addressee, status. */
  private readonly friendships: { id: string; from: string; to: string; status: 'pending' | 'accepted'; since: string }[] = []

  private readonly clubs: FakeClubs
  private readonly sessions: FakeSessions
  private readonly viewer: () => { id: string; card: PersonCard } | null

  constructor(clubs: FakeClubs, sessions: FakeSessions, viewer: () => { id: string; card: PersonCard } | null) {
    this.clubs = clubs
    this.sessions = sessions
    this.viewer = viewer
  }

  /** Makes `person` the viewer's friend already (as an accepted request). */
  befriend(person: PersonCard) {
    const me = this.viewer()
    if (!me) throw new Error('Sign someone in before seeding friends')
    this.people.set(person.userId, person)
    this.friendships.push({ id: randomUUID(), from: me.id, to: person.userId, status: 'accepted', since: new Date().toISOString() })
  }

  /** Someone asks the viewer to be friends (as a request sent from another account). */
  requestFrom(person: PersonCard) {
    const me = this.viewer()
    if (!me) throw new Error('Sign someone in before seeding friend requests')
    this.people.set(person.userId, person)
    this.friendships.push({ id: randomUUID(), from: person.userId, to: me.id, status: 'pending', since: new Date().toISOString() })
  }

  /** What someone's public profile shows beyond their card (`GET /api/users/:username`): city, sports, links, clubs. */
  private readonly profiles = new Map<string, Partial<Omit<PersonProfileView, 'userId' | 'username' | 'isMe' | 'friend'>>>()
  setProfile(userId: string, details: Partial<Omit<PersonProfileView, 'userId' | 'username' | 'isMe' | 'friend'>>) {
    this.profiles.set(userId, details)
  }

  /** Posts announcements for a club before the page loads. */
  seedAnnouncements(clubId: string, items: (Partial<AnnouncementRecord> & { title: string })[]) {
    const now = new Date().toISOString()
    this.announcements.set(clubId, [...(this.announcements.get(clubId) ?? []), ...items.map((a) => ({ id: randomUUID(), body: '', pinned: false, createdAt: now, updatedAt: now, ...a }))])
  }

  /** Saves a club's feedback form before the page loads. */
  seedForm(clubId: string, form: FeedbackFormInput) {
    this.forms.set(clubId, { ...cleanFeedbackForm(form), updatedAt: new Date().toISOString() })
  }

  /** Everyone the friend search can find (from the clubs fake's people, plus anyone who asked). */
  private readonly people = new Map<string, PersonCard>()
  private findable(): PersonCard[] {
    return [...new Map([...this.clubs.people.map((p) => [p.userId, p] as const), ...this.people]).values()]
  }

  handle(method: string, path: string, raw: string | null): FakeResponse | null {
    try {
      return this.route(method, path, raw)
    } catch (error) {
      return fail(error)
    }
  }

  private route(method: string, path: string, raw: string | null): FakeResponse | null {
    const [pathname, search = ''] = path.split('?')
    const owner = /^\/clubs\/([^/]+)\/feedback$/.exec(pathname!)
    if (owner) return this.ownerFeedback(method, owner[1]!, raw)
    const ownerNews = /^\/clubs\/([^/]+)\/announcements(?:\/([^/]+))?$/.exec(pathname!)
    if (ownerNews) return this.ownerAnnouncements(method, ownerNews[1]!, ownerNews[2] ?? null, raw)
    const memberNews = /^\/directory\/([^/]+)\/announcements$/.exec(pathname!)
    if (memberNews && method === 'GET') return this.memberAnnouncements(decodeURIComponent(memberNews[1]!))
    const member = /^\/directory\/([^/]+)\/feedback$/.exec(pathname!)
    if (member) return this.memberFeedback(method, decodeURIComponent(member[1]!), raw)
    if (pathname === '/friends' || pathname!.startsWith('/friends/')) return this.friends(method, pathname!, new URLSearchParams(search), raw)
    if (pathname === '/play' || pathname!.startsWith('/play/')) return this.play(pathname!, method, raw)
    const person = /^\/users\/([^/]+)$/.exec(pathname!)
    if (person && method === 'GET') return this.person(decodeURIComponent(person[1]!))
    return null
  }

  /** As routes/clubs.ts: every change answers with the whole list. */
  private ownerAnnouncements(method: string, clubId: string, id: string | null, raw: string | null): FakeResponse {
    if (!this.clubs.has(clubId)) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
    const records = this.announcements.get(clubId) ?? []
    const gone = () => notFound('That announcement was deleted, maybe on another device.')
    if (method === 'POST' && !id) {
      const input = cleanAnnouncement(parse(announcementSchema, raw))
      const blocked = addAnnouncementBlockedReason(records.length) ?? (input.pinned ? pinBlockedReason(records, null) : null)
      if (blocked) throw conflict(blocked)
      const now = new Date().toISOString()
      records.push({ id: randomUUID(), ...input, createdAt: now, updatedAt: now })
    } else if (method === 'PUT' && id) {
      const input = cleanAnnouncement(parse(announcementSchema, raw))
      const blocked = input.pinned ? pinBlockedReason(records, id) : null
      if (blocked) throw conflict(blocked)
      const record = records.find((r) => r.id === id)
      if (!record) throw gone()
      Object.assign(record, input, { updatedAt: new Date(Date.now() + 1000).toISOString() })
    } else if (method === 'DELETE' && id) {
      const at = records.findIndex((r) => r.id === id)
      if (at < 0) throw gone()
      records.splice(at, 1)
    }
    this.announcements.set(clubId, records)
    return ok(announcementsView(records, new Date()))
  }

  private memberAnnouncements(handle: string): FakeResponse {
    const me = this.viewer()
    const at = me && this.clubs.memberAt(handle, me.id)
    if (!at) throw notFound('No club has that handle. The link may be wrong, or the club changed its handle.')
    if (!at.memberName) throw new ApiError('forbidden', 'Join the club to read its announcements.')
    const now = new Date()
    return ok(sortAnnouncements(this.announcements.get(at.clubId) ?? []).slice(0, 10).map((r) => announcementView(r, now)))
  }

  private ownerFeedback(method: string, clubId: string, raw: string | null): FakeResponse {
    if (!this.clubs.has(clubId)) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
    if (method === 'PUT') this.forms.set(clubId, { ...cleanFeedbackForm(parse(feedbackFormSchema, raw)), updatedAt: new Date().toISOString() })
    const form = formOf(this.forms.get(clubId) ?? null)
    const ended = this.sessions.inClub(clubId).filter((s) => s.endedAt)
    const sessions = ended.map((s) => ({
      id: s.state.id,
      title: s.state.title,
      sportId: s.state.settings.sportId as SportId,
      endedAt: s.endedAt!,
      players: Object.values(s.state.players).filter((p) => p.active).length,
    }))
    const responses = this.responses.filter((r) => ended.some((s) => s.state.id === r.sessionId))
    return ok({ form, sessions: feedbackResults(form, sessions, responses) })
  }

  private prompts(clubId: string, memberName: string, userId: string): MemberFeedbackView {
    const record = this.forms.get(clubId)
    const form = record?.enabled ? formOf(record) : null
    const sessions = this.sessions
      .inClub(clubId)
      .filter((s) => inWindow(s.endedAt) && onRoster(s.state, memberName))
      .sort((a, b) => b.endedAt!.localeCompare(a.endedAt!))
      .map((s) => ({
        sessionId: s.state.id,
        label: feedbackSessionLabel(s.state.title, s.state.settings.sportId),
        sportId: s.state.settings.sportId,
        endedAt: s.endedAt!,
        answered: this.responses.some((r) => r.sessionId === s.state.id && r.userId === userId),
      }))
    return { form, sessions: form ? sessions : [] }
  }

  private memberFeedback(method: string, handle: string, raw: string | null): FakeResponse {
    const me = this.viewer()
    const at = me && this.clubs.memberAt(handle, me.id)
    if (!at) throw notFound('No club has that handle. The link may be wrong, or the club changed its handle.')
    if (!at.memberName) throw new ApiError('forbidden', 'Join the club to answer its feedback form.')
    const view = this.prompts(at.clubId, at.memberName, me.id)
    if (method === 'POST') {
      const { sessionId, answers } = parse(feedbackSubmitSchema, raw)
      if (!view.form) throw conflict("The club has turned its feedback form off, so it isn't taking answers now.")
      const session = view.sessions.find((s) => s.sessionId === sessionId)
      if (!session) throw notFound(`That session isn't one you played in, or it ended too long ago to answer for.`)
      if (session.answered) throw conflict('You have already answered for this session. Thanks!')
      this.responses.push({ sessionId, userId: me.id, memberName: at.memberName, answers: cleanAnswers(view.form, answers), createdAt: new Date().toISOString() })
      return ok(this.prompts(at.clubId, at.memberName, me.id))
    }
    return ok(view)
  }

  /** Someone's public profile, with where the viewer stands with them, as routes/users.ts answers. */
  private person(raw: string): FakeResponse {
    const me = this.viewer()
    if (!me) throw new ApiError('unauthorized', 'You are not signed in, or your sign-in expired. Sign in to continue.')
    const username = raw.trim().replace(/^@+/, '').toLowerCase()
    const card = [me.card, ...this.findable()].find((p) => p.username === username)
    if (!card) throw notFound("There's nobody on Matchpoynt with that username.")
    const isMe = card.userId === me.id
    const record = this.records(me.id).find((r) => r.person.userId === card.userId)
    const view: PersonProfileView = {
      userId: card.userId,
      username,
      avatarUrl: card.avatarUrl,
      avatarPosition: card.avatarPosition,
      city: null,
      role: 'player',
      memberSince: '2026-01-15T10:00:00.000Z',
      socialLinks: [],
      sports: [],
      clubs: [],
      ...this.profiles.get(card.userId),
      isMe,
      friend: isMe ? null : { status: record ? (record.status === 'accepted' ? 'friends' : record.incoming ? 'incoming' : 'outgoing') : 'none', friendshipId: record?.id ?? null },
    }
    return ok(view)
  }

  /** The viewer's friendships as `my_friends` returns them. */
  private records(meId: string): FriendshipRecord[] {
    const card = (userId: string) => this.findable().find((p) => p.userId === userId)
    return this.friendships
      .filter((f) => f.from === meId || f.to === meId)
      .flatMap((f) => {
        const other = card(f.from === meId ? f.to : f.from)
        if (!other) return []
        const { email: _email, ...person } = other
        return [{ id: f.id, status: f.status, incoming: f.to === meId, since: f.since, person }]
      })
  }

  private friends(method: string, path: string, params: URLSearchParams, raw: string | null): FakeResponse | null {
    const me = this.viewer()
    if (!me) throw new ApiError('unauthorized', 'You are not signed in, or your sign-in expired. Sign in to continue.')
    const view = () => ok(friendsView(this.records(me.id)))
    if (path === '/friends' && method === 'GET') return view()
    if (path === '/friends/search' && method === 'GET') {
      const q = (params.get('q') ?? '').trim().replace(/^@/, '').toLowerCase()
      const people =
        q.length < 2
          ? []
          : this.findable()
              .filter((p) => p.userId !== me.id && [p.username, p.displayName, p.email].some((v) => v?.toLowerCase().includes(q)))
              .slice(0, 5)
      return ok({ people: withFriendStatus(people, this.records(me.id)) })
    }
    if (path === '/friends' && method === 'POST') {
      const { userId } = parse(friendRequestSchema, raw)
      const records = this.records(me.id)
      const blocked = friendRequestBlockedReason(me.id, userId, records)
      if (blocked) throw conflict(blocked)
      const action = requestAction(userId, records)
      if (action === 'request') this.friendships.push({ id: randomUUID(), from: me.id, to: userId, status: 'pending', since: new Date().toISOString() })
      else
        Object.assign(
          this.friendships.find((f) => f.id === action.accept)!,
          { status: 'accepted', since: new Date().toISOString() },
        )
      return view()
    }
    const one = /^\/friends\/([^/]+)$/.exec(path)
    if (!one) return null
    const index = this.friendships.findIndex((f) => f.id === one[1] && (f.from === me.id || f.to === me.id))
    if (method === 'POST') {
      const { accept } = parse(inviteAnswerSchema, raw)
      const blocked = answerBlockedReason(one[1]!, this.records(me.id))
      if (blocked) throw notFound(blocked)
      if (accept) Object.assign(this.friendships[index]!, { status: 'accepted', since: new Date().toISOString() })
      else this.friendships.splice(index, 1)
      return view()
    }
    if (method === 'DELETE') {
      if (index < 0) throw notFound('That friend request is no longer open. It may have been cancelled or answered on another device.')
      this.friendships.splice(index, 1)
      return view()
    }
    return null
  }

  /** The club's badges and its finished sessions (not this one), as routes/play.ts awards them. */
  private awards(clubId: string, sessionId: string) {
    const ended = this.sessions.inClub(clubId).filter((s) => s.endedAt && s.state.id !== sessionId)
    return {
      clubBadges: this.clubs.badgeViews(clubId),
      clubHistory: {
        players: ended.flatMap((s) => Object.values(s.state.players).map((p) => ({ id: p.id, sessionId: s.state.id, name: p.name }))),
        matches: ended.flatMap((s) => this.sessions.live(s.state.id)!.finished),
      },
    }
  }

  private play(path: string, method = 'GET', raw: string | null = null): FakeResponse {
    const me = this.viewer()
    if (!me) throw new ApiError('unauthorized', 'You are not signed in, or your sign-in expired. Sign in to continue.')
    // As routes/play.ts: plans they're signed up for that start soon (my_upcoming_plans).
    if (path === '/play/upcoming') return ok(this.clubs.upcomingFor(me.id))
    if (path === '/play') {
      const sessions: PlayerLiveListResponse['sessions'] = []
      for (const clubId of this.clubs.ids()) {
        const at = this.clubs.memberIn(clubId, me.id)
        if (!at?.memberName) continue
        for (const s of this.sessions.inClub(clubId)) {
          if (s.state.status !== 'active' || !onRoster(s.state, at.memberName)) continue
          const live = this.sessions.live(s.state.id)!
          const status = playerLiveView(settleCheckIns(live.state), at.club, at.memberName, live.finished, Date.now(), this.awards(clubId, live.state.id)).me?.status ?? 'not_in_session'
          sessions.push({
            sessionId: s.state.id,
            title: feedbackSessionLabel(s.state.title, s.state.settings.sportId),
            sportId: s.state.settings.sportId,
            clubName: at.club.name,
            startedAt: s.createdAt,
            status,
          })
        }
      }
      return ok({ sessions })
    }
    const [sessionId, rest] = path.slice('/play/'.length).split('/')
    const live = this.sessions.live(sessionId!)
    const at = live?.clubId ? this.clubs.memberIn(live.clubId, me.id) : null
    if (!live || !at?.memberName) throw notFound("That session isn't one of your clubs' sessions, or it has been removed.")
    const running = live.state.status === 'active'
    // As routes/play.ts: checking in from the app (player_check_in), then the refreshed view.
    if (rest === 'check-in' && method === 'POST') {
      const result = this.sessions.recordCheckIn(live.state.id, at.memberName)
      if (result === 'closed') throw conflict('This session has ended, so check-in is closed.')
      if (result === 'not_on_roster') throw notFound("You're not on this session's roster. Ask the Queue Master to add you.")
      return this.play(`/play/${live.state.id}`)
    }
    // As routes/play.ts: starting or ending their own break (set_player_break), then the refreshed view.
    if (rest === 'break' && method === 'POST') {
      const { onBreak } = parse(breakSchema, raw)
      const blocked = this.sessions.setOwnBreak(live.state.id, at.memberName, onBreak)
      if (blocked) throw conflict(blocked)
      return this.play(`/play/${live.state.id}`)
    }
    // As routes/play.ts: the leaderboard (live, or final once it ended) with the club's own badges.
    if (rest === 'leaderboard') {
      const awards = this.awards(live.clubId!, live.state.id)
      const players = Object.values(live.state.players)
      const career = careerTotals({
        players: [...awards.clubHistory.players, ...players.map((p) => ({ id: p.id, sessionId: live.state.id, name: p.name }))],
        matches: [...awards.clubHistory.matches, ...live.finished],
      })
      return ok(leaderboardView(live.state.id, players, live.finished, awards.clubBadges, career, at.memberName, this.clubs.leaderboardClub(live.clubId!)))
    }
    // Ended: its players' ended screen, as player_ended_session answers.
    if (!running) {
      const stored = this.sessions.inClub(live.clubId!).find((s) => s.state.id === live.state.id)!
      return ok({
        ended: true,
        sessionId: live.state.id,
        title: feedbackSessionLabel(live.state.title, live.state.settings.sportId),
        sportId: live.state.settings.sportId,
        clubName: at.club.name,
        clubHandle: at.club.handle,
        endedAt: stored.endedAt!,
        // As 0041's player_ended_session: what the viewer owes and the club's QR codes.
        payment: (() => {
          const { fee, invoice } = this.sessions.invoiceOf(live.state.id, at.memberName)
          return playerPayment(fee, invoice && { amount: invoice.amount, currency: fee!.currency, games: invoice.games, payments: invoice.payments })
        })(),
        paymentQrs: this.clubs.paymentQrsOf(live.clubId!),
      })
    }
    // The viewer's friends, as routes/play.ts passes them, to say which are here.
    const friendNames = this.records(me.id)
      .filter((r) => r.status === 'accepted' && r.person.username)
      .map((r) => r.person.username!)
    return ok(playerLiveView(settleCheckIns(live.state), at.club, at.memberName, live.finished, Date.now(), this.awards(live.clubId!, live.state.id), friendNames))
  }
}
