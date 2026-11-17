import { announcementLimits, type ClubAnnouncementInput, type ClubAnnouncementsView, type ClubAnnouncementView } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// Club announcements: the owner posts news for members. Pure rules, no I/O.

/** A stored announcement (club_announcements). */
export interface AnnouncementRecord {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

/** A trimmed, checked announcement: a title, an optional body, pinned or not. */
export function cleanAnnouncement(input: ClubAnnouncementInput): ClubAnnouncementInput {
  const title = input.title.trim().replace(/\s+/g, ' ')
  const body = input.body.trim().replace(/\n{3,}/g, '\n\n')
  if (!title) throw invalid('Give the announcement a title.', { title: 'Required.' })
  if (title.length > announcementLimits.titleMaxLength) throw invalid(`Keep the title to ${announcementLimits.titleMaxLength} characters.`, { title: 'Too long.' })
  if (body.length > announcementLimits.bodyMaxLength) throw invalid(`Keep the announcement to ${announcementLimits.bodyMaxLength} characters.`, { body: 'Too long.' })
  return { title, body, pinned: input.pinned }
}

/** Why another announcement can't be posted, or `null`. */
export function addAnnouncementBlockedReason(count: number): string | null {
  return count >= announcementLimits.maxPerClub ? `A club keeps up to ${announcementLimits.maxPerClub} announcements. Delete an old one to post another.` : null
}

/** Why `id` (or a new announcement, `null`) can't be pinned, or `null` when it can. */
export function pinBlockedReason(records: AnnouncementRecord[], id: string | null): string | null {
  const pinned = records.filter((r) => r.pinned && r.id !== id).length
  return pinned >= announcementLimits.maxPinned ? `Up to ${announcementLimits.maxPinned} announcements can be pinned. Unpin one first.` : null
}

/** Pinned first, then newest. */
export function sortAnnouncements<T extends { pinned: boolean; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
}

/** One announcement as clients see it, marked new while it's recent. */
export function announcementView(r: AnnouncementRecord, now: Date): ClubAnnouncementView {
  return { ...r, isNew: now.getTime() - Date.parse(r.createdAt) < announcementLimits.newForDays * 86_400_000 }
}

/** The owner's page: every announcement, pinned first then newest, with whether another can be posted or pinned. */
export function announcementsView(records: AnnouncementRecord[], now: Date): ClubAnnouncementsView {
  return {
    announcements: sortAnnouncements(records).map((r) => announcementView(r, now)),
    addBlockedReason: addAnnouncementBlockedReason(records.length),
    pinBlockedReason: pinBlockedReason(records, null),
  }
}
