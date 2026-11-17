import { announcementLimits } from '@matchpoynt/shared'
import type { AnnouncementRecord } from '@/utils/club/announcements'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Club announcements. The owner manages them under RLS; members read them
// through `club_announcements_for` (0046).

interface AnnouncementRow {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
}

const toRecord = (r: AnnouncementRow): AnnouncementRecord => ({ id: r.id, title: r.title, body: r.body, pinned: r.pinned, createdAt: r.created_at, updatedAt: r.updated_at })

/** Every announcement of the owner's club. */
export async function loadAnnouncements(db: Db, clubId: string): Promise<AnnouncementRecord[]> {
  const { data, error } = await db.from('club_announcements').select('id, title, body, pinned, created_at, updated_at').eq('club_id', clubId)
  dbFail(error)
  return (data ?? []).map(toRecord)
}

/** The newest announcements for a member (pinned first), or `null` when the caller isn't a member. */
export async function loadMemberAnnouncements(db: Db, clubId: string): Promise<AnnouncementRecord[] | null> {
  const { data, error } = await db.rpc('club_announcements_for', { p_club_id: clubId, p_limit: announcementLimits.shownToMembers })
  dbFail(error)
  const rows = data as unknown as AnnouncementRow[] | null
  return rows ? rows.map(toRecord) : null
}

export async function createAnnouncement(db: Db, clubId: string, a: { title: string; body: string; pinned: boolean }): Promise<void> {
  const { error } = await db.from('club_announcements').insert({ id: crypto.randomUUID(), club_id: clubId, ...a })
  dbFail(error)
}

/** `false` when it's gone. */
export async function updateAnnouncement(db: Db, clubId: string, id: string, a: { title: string; body: string; pinned: boolean }): Promise<boolean> {
  const { data, error } = await db.from('club_announcements').update({ ...a, updated_at: new Date().toISOString() }).eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

/** `false` when it's already gone. */
export async function deleteAnnouncement(db: Db, clubId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('club_announcements').delete().eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}
