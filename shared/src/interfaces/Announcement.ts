/** A club announcement, as owners and members see it. */
export interface ClubAnnouncementView {
  id: string
  title: string
  body: string
  /** Pinned announcements come first. */
  pinned: boolean
  /** ISO. */
  createdAt: string
  /** ISO; equal to `createdAt` until it's edited. */
  updatedAt: string
  /** Posted within `announcementLimits.newForDays`, decided by the API. */
  isNew: boolean
}

/** Posting or editing an announcement (`POST`/`PUT /api/clubs/:id/announcements`). */
export interface ClubAnnouncementInput {
  title: string
  body: string
  pinned: boolean
}

/** A club's announcements, pinned first then newest, with whether another can be posted or pinned. */
export interface ClubAnnouncementsView {
  announcements: ClubAnnouncementView[]
  /** Why another can't be posted (the club is at its limit), or `null`. */
  addBlockedReason: string | null
  /** Why another can't be pinned, or `null`. */
  pinBlockedReason: string | null
}
