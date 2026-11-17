import { announcementLimits } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { addAnnouncementBlockedReason, announcementsView, cleanAnnouncement, pinBlockedReason, type AnnouncementRecord } from '@/utils/club/announcements'

const now = new Date('2026-11-18T12:00:00Z')
const record = (id: string, createdAt: string, pinned = false): AnnouncementRecord => ({ id, title: id, body: '', pinned, createdAt, updatedAt: createdAt })

describe('cleanAnnouncement', () => {
  it('trims the title and body and keeps the pin', () => {
    expect(cleanAnnouncement({ title: '  Court  change ', body: ' Courts 3 and 4.\n\n\n\nSee you! ', pinned: true })).toEqual({ title: 'Court change', body: 'Courts 3 and 4.\n\nSee you!', pinned: true })
  })

  it('refuses an empty title and anything too long', () => {
    expect(() => cleanAnnouncement({ title: '   ', body: '', pinned: false })).toThrow('Give the announcement a title.')
    expect(() => cleanAnnouncement({ title: 'x'.repeat(announcementLimits.titleMaxLength + 1), body: '', pinned: false })).toThrow('title')
    expect(() => cleanAnnouncement({ title: 'Hi', body: 'x'.repeat(announcementLimits.bodyMaxLength + 1), pinned: false })).toThrow('characters')
  })
})

describe('limits', () => {
  it('stops posting at the club limit', () => {
    expect(addAnnouncementBlockedReason(announcementLimits.maxPerClub - 1)).toBeNull()
    expect(addAnnouncementBlockedReason(announcementLimits.maxPerClub)).toContain('Delete an old one')
  })

  it('stops pinning more than the limit, but an already pinned one can stay pinned', () => {
    const pinned = Array.from({ length: announcementLimits.maxPinned }, (_, i) => record(`p${i}`, '2026-11-01T00:00:00Z', true))
    expect(pinBlockedReason(pinned, null)).toContain('Unpin one first')
    expect(pinBlockedReason(pinned, 'p0')).toBeNull()
    expect(pinBlockedReason(pinned.slice(1), null)).toBeNull()
  })
})

describe('announcementsView', () => {
  it('puts pinned first, then newest, and marks recent ones new', () => {
    const view = announcementsView([record('old', '2026-10-01T00:00:00Z'), record('recent', '2026-11-17T00:00:00Z'), record('pinned', '2026-09-01T00:00:00Z', true)], now)
    expect(view.announcements.map((a) => a.id)).toEqual(['pinned', 'recent', 'old'])
    expect(view.announcements.map((a) => a.isNew)).toEqual([false, true, false])
    expect(view.addBlockedReason).toBeNull()
  })
})
