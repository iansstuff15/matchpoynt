import { friendLimits } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { answerBlockedReason, friendRequestBlockedReason, friendStatus, friendsView, requestAction, withFriendStatus, type FriendshipRecord } from '@/utils/friends/rules'

const person = (userId: string, username = userId) => ({ userId, username, displayName: username, avatarUrl: null, avatarPosition: { x: 50, y: 50, zoom: 1 } })
const record = (id: string, userId: string, o: Partial<FriendshipRecord> = {}): FriendshipRecord => ({ id, status: 'pending', incoming: false, since: '2026-11-01T10:00:00Z', person: person(userId), ...o })

describe('friendRequestBlockedReason', () => {
  it('lets anyone new be asked', () => {
    expect(friendRequestBlockedReason('me', 'ben', [])).toBeNull()
  })
  it('refuses yourself, friends and people already asked', () => {
    expect(friendRequestBlockedReason('me', 'me', [])).toMatch(/yourself/)
    expect(friendRequestBlockedReason('me', 'ben', [record('f1', 'ben', { status: 'accepted' })])).toBe("You're already friends with @ben.")
    expect(friendRequestBlockedReason('me', 'ben', [record('f1', 'ben')])).toMatch(/already asked @ben/)
  })
  it('lets you ask back someone who asked you (which accepts it)', () => {
    const records = [record('f1', 'ben', { incoming: true })]
    expect(friendRequestBlockedReason('me', 'ben', records)).toBeNull()
    expect(requestAction('ben', records)).toEqual({ accept: 'f1' })
    expect(requestAction('cy', records)).toBe('request')
  })
  it('caps requests waiting for an answer', () => {
    const waiting = Array.from({ length: friendLimits.maxOutgoing }, (_, i) => record(`f${i}`, `p${i}`))
    expect(friendRequestBlockedReason('me', 'new', waiting)).toMatch(/waiting for an answer/)
  })
})

describe('answerBlockedReason', () => {
  it('only lets the person asked answer an open request', () => {
    const records = [record('in', 'ben', { incoming: true }), record('out', 'cy'), record('done', 'dee', { status: 'accepted', incoming: true })]
    expect(answerBlockedReason('in', records)).toBeNull()
    expect(answerBlockedReason('out', records)).toMatch(/no longer open/)
    expect(answerBlockedReason('done', records)).toMatch(/no longer open/)
    expect(answerBlockedReason('gone', records)).toMatch(/no longer open/)
  })
})

describe('friendsView', () => {
  it('lists friends by name and requests newest first', () => {
    const view = friendsView([
      record('a', 'zoe', { status: 'accepted' }),
      record('b', 'amy', { status: 'accepted' }),
      record('c', 'old', { incoming: true, since: '2026-10-01T00:00:00Z' }),
      record('d', 'new', { incoming: true, since: '2026-11-10T00:00:00Z' }),
      record('e', 'sent'),
    ])
    expect(view.friends.map((f) => f.person.username)).toEqual(['amy', 'zoe'])
    expect(view.incoming.map((f) => f.person.username)).toEqual(['new', 'old'])
    expect(view.outgoing.map((f) => f.person.username)).toEqual(['sent'])
  })
})

describe('withFriendStatus', () => {
  it('says where each person found stands with the caller', () => {
    const people = ['ben', 'cy', 'dee', 'eli'].map((u) => ({ ...person(u), email: null }))
    const records = [record('f1', 'ben', { status: 'accepted' }), record('f2', 'cy', { incoming: true }), record('f3', 'dee')]
    expect(withFriendStatus(people, records).map((p) => [p.username, p.status, p.friendshipId])).toEqual([
      ['ben', 'friends', 'f1'],
      ['cy', 'incoming', 'f2'],
      ['dee', 'outgoing', 'f3'],
      ['eli', 'none', null],
    ])
    expect(friendStatus(undefined)).toBe('none')
  })
})
