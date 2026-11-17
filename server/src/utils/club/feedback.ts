import {
  defaultFeedbackForm,
  feedbackLimits,
  feedbackQuestionKinds,
  sportRules,
  type FeedbackAnswer,
  type FeedbackFormInput,
  type FeedbackFormView,
  type FeedbackQuestion,
  type FeedbackQuestionResult,
  type FeedbackSessionResult,
  type SportId,
} from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// A club's post-session feedback form: the owner builds it, members answer it
// for each session they played in. Pure rules, no I/O.

/** A stored form (club_feedback_forms), or `null` before the owner saved one. */
export interface FeedbackFormRecord {
  title: string
  intro: string
  enabled: boolean
  questions: unknown
  updatedAt: string
}

/** A finished session of the club, for the results page. */
export interface FeedbackSessionRecord {
  id: string
  title: string | null
  sportId: SportId
  endedAt: string
  players: number
}

/** One member's answers about one session. */
export interface FeedbackResponseRecord {
  sessionId: string
  memberName: string
  answers: unknown
  createdAt: string
}

const kinds = Object.keys(feedbackQuestionKinds)
const asQuestions = (value: unknown): FeedbackQuestion[] =>
  Array.isArray(value)
    ? value.filter((q): q is FeedbackQuestion => Boolean(q) && typeof q === 'object' && typeof q.id === 'string' && kinds.includes(q.kind) && typeof q.prompt === 'string')
    : []

/** The form the club shows: what the owner saved, or the default (off) until they do. */
export function formOf(record: FeedbackFormRecord | null): FeedbackFormView {
  if (!record) return { ...defaultFeedbackForm(), updatedAt: null }
  return {
    title: record.title,
    intro: record.intro,
    enabled: record.enabled,
    questions: asQuestions(record.questions).map((q) => ({ ...q, required: Boolean(q.required), options: Array.isArray(q.options) ? q.options.map(String) : [] })),
    updatedAt: record.updatedAt,
  }
}

/** Ids the form builder sends are only keys within the form; blank or repeated ones get a fresh one. */
const questionId = (raw: string, used: Set<string>, fresh: () => string) => {
  const id = raw.trim()
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) && !used.has(id) ? id : fresh()
}

/**
 * Checks a form and tidies it: trimmed text, options only on choice
 * questions, every question with its own id. Throws `invalid`, naming the
 * question at fault (`questions.<n>`), when something doesn't make sense.
 */
export function cleanFeedbackForm(input: FeedbackFormInput, fresh: () => string = () => crypto.randomUUID()): FeedbackFormInput {
  const title = input.title.trim()
  const intro = input.intro.trim()
  if (!title) throw invalid('Give the form a title, like "How was the session?".', { title: 'Missing' })
  if (title.length > feedbackLimits.titleMaxLength) throw invalid(`Titles can be up to ${feedbackLimits.titleMaxLength} characters.`, { title: 'Too long' })
  if (intro.length > feedbackLimits.introMaxLength) throw invalid(`The introduction can be up to ${feedbackLimits.introMaxLength} characters.`, { intro: 'Too long' })
  if (input.questions.length === 0) throw invalid('Add at least one question.', { questions: 'Missing' })
  if (input.questions.length > feedbackLimits.maxQuestions) throw invalid(`A form can ask up to ${feedbackLimits.maxQuestions} questions.`, { questions: 'Too many' })

  const used = new Set<string>()
  const questions = input.questions.map((q, i) => {
    const where = { [`questions.${i}`]: 'Invalid' }
    const n = i + 1
    const prompt = q.prompt.trim()
    if (!prompt) throw invalid(`Question ${n} needs some text.`, where)
    if (prompt.length > feedbackLimits.promptMaxLength) throw invalid(`Question ${n} can be up to ${feedbackLimits.promptMaxLength} characters.`, where)
    let options: string[] = []
    if (q.kind === 'choice') {
      options = q.options.map((o) => o.trim()).filter(Boolean)
      if (options.length < feedbackLimits.minOptions) throw invalid(`Question ${n} needs at least ${feedbackLimits.minOptions} answers to choose from.`, where)
      if (options.length > feedbackLimits.maxOptions) throw invalid(`Question ${n} can offer up to ${feedbackLimits.maxOptions} answers.`, where)
      const long = options.find((o) => o.length > feedbackLimits.optionMaxLength)
      if (long) throw invalid(`Answers can be up to ${feedbackLimits.optionMaxLength} characters ("${long.slice(0, 20)}…" in question ${n}).`, where)
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw invalid(`Question ${n} offers the same answer twice.`, where)
    }
    const id = questionId(q.id, used, fresh)
    used.add(id)
    return { id, kind: q.kind, prompt, required: q.required, options }
  })
  return { title, intro, enabled: input.enabled, questions }
}

/**
 * Checks a member's answers against the form: every answer for one of its
 * questions, of the right kind, and every required question answered. Empty
 * written answers are dropped. Returns the answers in the form's order.
 */
export function cleanAnswers(form: FeedbackFormInput, answers: FeedbackAnswer[]): FeedbackAnswer[] {
  const seen = new Set<string>()
  const byId = new Map<string, FeedbackAnswer>()
  for (const answer of answers) {
    const question = form.questions.find((q) => q.id === answer.questionId)
    if (!question) throw invalid('The form has changed since it was opened. Reload it and answer again.', { answers: 'Unknown question' })
    if (seen.has(question.id)) throw invalid(`"${question.prompt}" was answered twice.`, { [`answers.${question.id}`]: 'Repeated' })
    seen.add(question.id)
    const field = { [`answers.${question.id}`]: 'Invalid' }
    const { value } = answer
    if (question.kind === 'rating') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > feedbackLimits.ratingMax) throw invalid(`Rate "${question.prompt}" from 1 to ${feedbackLimits.ratingMax}.`, field)
      byId.set(question.id, { questionId: question.id, value })
    } else if (question.kind === 'choice') {
      if (typeof value !== 'string' || !question.options.includes(value)) throw invalid(`Pick one of the answers to "${question.prompt}".`, field)
      byId.set(question.id, { questionId: question.id, value })
    } else if (question.kind === 'yes_no') {
      if (typeof value !== 'boolean') throw invalid(`Answer "${question.prompt}" with yes or no.`, field)
      byId.set(question.id, { questionId: question.id, value })
    } else {
      if (typeof value !== 'string') throw invalid(`Write your answer to "${question.prompt}".`, field)
      const text = value.trim()
      if (text.length > feedbackLimits.textAnswerMaxLength) throw invalid(`Answers can be up to ${feedbackLimits.textAnswerMaxLength} characters.`, field)
      if (text) byId.set(question.id, { questionId: question.id, value: text })
    }
  }
  const missing = form.questions.find((q) => q.required && !byId.has(q.id))
  if (missing) throw invalid(`Answer "${missing.prompt}": it's required.`, { [`answers.${missing.id}`]: 'Required' })
  return form.questions.flatMap((q) => byId.get(q.id) ?? [])
}

/** "Badminton session", or the session's own title. */
export const feedbackSessionLabel = (title: string | null, sportId: SportId) => title ?? `${sportRules[sportId]?.name ?? 'Court'} session`

const asAnswers = (value: unknown): FeedbackAnswer[] =>
  Array.isArray(value) ? value.filter((a): a is FeedbackAnswer => Boolean(a) && typeof a === 'object' && typeof a.questionId === 'string') : []

/** How one question was answered across responses (newest first). */
export function questionResult(question: FeedbackQuestion, responses: FeedbackResponseRecord[]): FeedbackQuestionResult {
  const answers = responses.flatMap((r) => {
    const answer = asAnswers(r.answers).find((a) => a.questionId === question.id)
    return answer ? [{ name: r.memberName, value: answer.value }] : []
  })
  const count = (match: (v: FeedbackAnswer['value']) => boolean) => answers.filter((a) => match(a.value)).length
  const base = { questionId: question.id, prompt: question.prompt, kind: question.kind, answered: answers.length, average: null, counts: [], texts: [] }
  switch (question.kind) {
    case 'rating': {
      const scores = answers.map((a) => a.value).filter((v): v is number => typeof v === 'number')
      const average = scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null
      const counts = Array.from({ length: feedbackLimits.ratingMax }, (_, i) => ({ label: String(i + 1), count: count((v) => v === i + 1) }))
      return { ...base, average, counts }
    }
    case 'choice':
      return { ...base, counts: question.options.map((o) => ({ label: o, count: count((v) => v === o) })) }
    case 'yes_no':
      return { ...base, counts: [{ label: 'Yes', count: count((v) => v === true) }, { label: 'No', count: count((v) => v === false) }] }
    case 'text':
      return { ...base, texts: answers.filter((a) => typeof a.value === 'string').slice(0, feedbackLimits.textsShown).map((a) => ({ name: a.name, text: String(a.value) })) }
  }
}

/** Each session's results under the current form, newest session first. Answers to removed questions aren't shown. */
export function feedbackResults(form: FeedbackFormInput, sessions: FeedbackSessionRecord[], responses: FeedbackResponseRecord[]): FeedbackSessionResult[] {
  return [...sessions]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .map((s) => {
      const mine = responses.filter((r) => r.sessionId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return {
        sessionId: s.id,
        label: feedbackSessionLabel(s.title, s.sportId),
        sportId: s.sportId,
        endedAt: s.endedAt,
        responses: mine.length,
        players: s.players,
        questions: form.questions.map((q) => questionResult(q, mine)),
      }
    })
}
