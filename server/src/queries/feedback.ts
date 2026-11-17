import { feedbackLimits, type FeedbackAnswer, type FeedbackFormInput, type MemberFeedbackView, type SportId } from '@matchpoynt/shared'
import type { Json } from '@/types/database'
import { feedbackSessionLabel, formOf, type FeedbackFormRecord, type FeedbackResponseRecord, type FeedbackSessionRecord } from '@/utils/club/feedback'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Club feedback forms and answers. The owner reads and saves the form and
// reads answers through RLS; members are asked and answer through
// `club_feedback_prompts` and `submit_club_feedback` (0035).

/** The club's saved form, or `null` before the owner saved one. */
export async function loadFeedbackForm(db: Db, clubId: string): Promise<FeedbackFormRecord | null> {
  const { data, error } = await db.from('club_feedback_forms').select('*').eq('club_id', clubId).maybeSingle()
  dbFail(error)
  return data && { title: data.title, intro: data.intro, enabled: data.enabled, questions: data.questions, updatedAt: data.updated_at }
}

export async function saveFeedbackForm(db: Db, clubId: string, form: FeedbackFormInput): Promise<void> {
  const { error } = await db
    .from('club_feedback_forms')
    .upsert({ club_id: clubId, title: form.title, intro: form.intro, enabled: form.enabled, questions: form.questions as unknown as Json, updated_at: new Date().toISOString() })
  dbFail(error)
}

/** The club's latest finished sessions (with how many played) and every answer about them. */
export async function loadFeedbackHistory(db: Db, clubId: string): Promise<{ sessions: FeedbackSessionRecord[]; responses: FeedbackResponseRecord[] }> {
  const { data, error } = await db
    .from('sessions')
    .select('id, title, sport_id, ended_at')
    .eq('club_id', clubId)
    .eq('status', 'ended')
    .order('ended_at', { ascending: false })
    .limit(feedbackLimits.sessionsShown)
  dbFail(error)
  const rows = (data ?? []).filter((r) => r.ended_at)
  if (!rows.length) return { sessions: [], responses: [] }
  const ids = rows.map((r) => r.id)
  const [players, responses] = await Promise.all([
    db.from('session_players').select('session_id').in('session_id', ids).eq('active', true),
    db.from('club_feedback_responses').select('session_id, member_name, answers, created_at').in('session_id', ids),
  ])
  dbFail(players.error ?? responses.error)
  return {
    sessions: rows.map((r) => ({
      id: r.id,
      title: r.title,
      sportId: r.sport_id as SportId,
      endedAt: r.ended_at!,
      players: (players.data ?? []).filter((p) => p.session_id === r.id).length,
    })),
    responses: (responses.data ?? []).map((r) => ({ sessionId: r.session_id, memberName: r.member_name, answers: r.answers, createdAt: r.created_at })),
  }
}

interface PromptRow {
  form: { title: string; intro: string; enabled: boolean; questions: unknown; updated_at: string } | null
  sessions: { session_id: string; title: string | null; sport_id: string; ended_at: string; answered: boolean }[]
}

/** What a member is asked: the form while it's on, and their recent sessions. `null` when they aren't a member. */
export async function loadFeedbackPrompts(db: Db, clubId: string): Promise<MemberFeedbackView | null> {
  const { data, error } = await db.rpc('club_feedback_prompts', { p_club_id: clubId, p_window_days: feedbackLimits.answerWindowDays })
  dbFail(error)
  const r = data as unknown as PromptRow | null
  if (!r) return null
  return {
    form: r.form && formOf({ title: r.form.title, intro: r.form.intro, enabled: r.form.enabled, questions: r.form.questions, updatedAt: r.form.updated_at }),
    sessions: r.form
      ? r.sessions.map((s) => ({ sessionId: s.session_id, label: feedbackSessionLabel(s.title, s.sport_id as SportId), sportId: s.sport_id as SportId, endedAt: s.ended_at, answered: s.answered }))
      : [],
  }
}

export async function submitFeedback(db: Db, clubId: string, sessionId: string, answers: FeedbackAnswer[]): Promise<void> {
  const { error } = await db.rpc('submit_club_feedback', {
    p_club_id: clubId,
    p_session_id: sessionId,
    p_answers: answers as unknown as Json,
    p_window_days: feedbackLimits.answerWindowDays,
  })
  dbFail(error)
}
