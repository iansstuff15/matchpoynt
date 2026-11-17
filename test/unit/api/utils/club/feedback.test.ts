import { defaultFeedbackForm, feedbackLimits, type FeedbackFormInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { cleanAnswers, cleanFeedbackForm, feedbackResults, formOf } from '@/utils/club/feedback'
import { ApiError } from '@/utils/http/errors'

let n = 0
const fresh = () => `fresh-${++n}`
const form = (o: Partial<FeedbackFormInput> = {}): FeedbackFormInput => ({ ...defaultFeedbackForm(), enabled: true, ...o })
const fails = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    if (e instanceof ApiError) return e
    throw e
  }
  throw new Error('expected an ApiError')
}

describe('cleanFeedbackForm', () => {
  it('keeps a good form, trimmed, with options only on choice questions', () => {
    const clean = cleanFeedbackForm(form({ title: '  Rate us ', questions: [{ id: 'q', kind: 'rating', prompt: ' Fun? ', required: true, options: ['stray'] }] }), fresh)
    expect(clean.title).toBe('Rate us')
    expect(clean.questions).toEqual([{ id: 'q', kind: 'rating', prompt: 'Fun?', required: true, options: [] }])
  })
  it('gives blank or repeated question ids fresh ones', () => {
    const q = { kind: 'yes_no' as const, prompt: 'Again?', required: false, options: [] }
    const clean = cleanFeedbackForm(form({ questions: [{ ...q, id: 'same' }, { ...q, id: 'same' }, { ...q, id: ' ' }] }), fresh)
    const ids = clean.questions.map((x) => x.id)
    expect(ids[0]).toBe('same')
    expect(new Set(ids).size).toBe(3)
  })
  it('refuses forms that make no sense, naming the question', () => {
    expect(fails(() => cleanFeedbackForm(form({ title: ' ' }))).fields).toEqual({ title: 'Missing' })
    expect(fails(() => cleanFeedbackForm(form({ questions: [] }))).message).toMatch(/at least one question/)
    const choice = { id: 'c', kind: 'choice' as const, prompt: 'Pick', required: false, options: ['Only one'] }
    expect(fails(() => cleanFeedbackForm(form({ questions: [choice] }))).fields).toEqual({ 'questions.0': 'Invalid' })
    expect(fails(() => cleanFeedbackForm(form({ questions: [{ ...choice, options: ['A', 'a'] }] }))).message).toMatch(/same answer twice/)
    const many = Array.from({ length: feedbackLimits.maxQuestions + 1 }, (_, i) => ({ ...choice, id: `q${i}`, options: ['A', 'B'] }))
    expect(fails(() => cleanFeedbackForm(form({ questions: many }))).message).toMatch(/up to/)
  })
})

describe('cleanAnswers', () => {
  const f = form()
  it('accepts answers of the right kind, in the form order, dropping empty text', () => {
    const answers = cleanAnswers(f, [
      { questionId: 'comments', value: '  ' },
      { questionId: 'again', value: true },
      { questionId: 'overall', value: 4 },
      { questionId: 'matches', value: 'About right' },
    ])
    expect(answers).toEqual([
      { questionId: 'overall', value: 4 },
      { questionId: 'matches', value: 'About right' },
      { questionId: 'again', value: true },
    ])
  })
  it('refuses wrong kinds, unknown questions and missing required ones', () => {
    expect(fails(() => cleanAnswers(f, [{ questionId: 'overall', value: 9 }])).message).toMatch(/from 1 to 5/)
    expect(fails(() => cleanAnswers(f, [{ questionId: 'overall', value: 3 }, { questionId: 'matches', value: 'Nope' }])).message).toMatch(/Pick one/)
    expect(fails(() => cleanAnswers(f, [{ questionId: 'overall', value: 3 }, { questionId: 'again', value: 'yes' }])).message).toMatch(/yes or no/)
    expect(fails(() => cleanAnswers(f, [{ questionId: 'nope', value: 3 }])).message).toMatch(/changed/)
    expect(fails(() => cleanAnswers(f, [])).fields).toEqual({ 'answers.overall': 'Required' })
  })
})

describe('feedbackResults', () => {
  it('averages ratings, counts choices and lists written answers per session, newest first', () => {
    const f = form()
    const sessions = [
      { id: 's1', title: null, sportId: 'badminton' as const, endedAt: '2026-11-01T22:00:00Z', players: 8 },
      { id: 's2', title: 'Friday night', sportId: 'badminton' as const, endedAt: '2026-11-08T22:00:00Z', players: 6 },
    ]
    const responses = [
      { sessionId: 's1', memberName: 'Ana', createdAt: '2026-11-02T08:00:00Z', answers: [{ questionId: 'overall', value: 5 }, { questionId: 'comments', value: 'More courts!' }] },
      { sessionId: 's1', memberName: 'Ben', createdAt: '2026-11-02T09:00:00Z', answers: [{ questionId: 'overall', value: 4 }, { questionId: 'again', value: true }] },
    ]
    const [latest, first] = feedbackResults(f, sessions, responses)
    expect(latest?.label).toBe('Friday night')
    expect(latest?.responses).toBe(0)
    expect(first?.label).toBe('Badminton session')
    const overall = first!.questions.find((q) => q.questionId === 'overall')!
    expect(overall.average).toBe(4.5)
    expect(overall.counts.map((c) => c.count)).toEqual([0, 0, 0, 1, 1])
    expect(first!.questions.find((q) => q.questionId === 'again')!.counts).toEqual([{ label: 'Yes', count: 1 }, { label: 'No', count: 0 }])
    expect(first!.questions.find((q) => q.questionId === 'comments')!.texts).toEqual([{ name: 'Ana', text: 'More courts!' }])
  })
})

describe('formOf', () => {
  it('is the default form, switched off, until the owner saves one', () => {
    expect(formOf(null)).toMatchObject({ enabled: false, updatedAt: null })
    expect(formOf(null).questions.length).toBeGreaterThan(0)
  })
})
