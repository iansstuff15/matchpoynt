import type { FeedbackQuestionKind } from '../types/club.ts'
import type { SportId } from '../types/sport.ts'

/** One question on a club's feedback form. `options` are the answers of a choice question (empty otherwise). */
export interface FeedbackQuestion {
  /** Stable within the form, so answers stay matched when questions are reordered or reworded. */
  id: string
  kind: FeedbackQuestionKind
  prompt: string
  required: boolean
  options: string[]
}

/** Body of saving a club's feedback form (`PUT /api/clubs/:id/feedback`). */
export interface FeedbackFormInput {
  title: string
  intro: string
  /** Members are only asked while it's on. */
  enabled: boolean
  questions: FeedbackQuestion[]
}

export interface FeedbackFormView extends FeedbackFormInput {
  /** When it was last saved; `null` while the club still has the default form. */
  updatedAt: string | null
}

/** One answer: a number for ratings, the option for choices, true/false for yes or no, text for written answers. */
export interface FeedbackAnswer {
  questionId: string
  value: number | string | boolean
}

/** Body of answering a session's feedback (`POST /api/directory/:handle/feedback`). */
export interface FeedbackSubmitInput {
  sessionId: string
  answers: FeedbackAnswer[]
}

/** How one question was answered across a session's responses, worked out by the API. */
export interface FeedbackQuestionResult {
  questionId: string
  prompt: string
  kind: FeedbackQuestionKind
  /** Responses that answered it. */
  answered: number
  /** Ratings: the mean, to one decimal; `null` for other kinds or no answers. */
  average: number | null
  /** Ratings (1 to max), choices (each option) and yes or no: how many picked each, in order. */
  counts: { label: string; count: number }[]
  /** Written answers, newest first, with who wrote them. */
  texts: { name: string; text: string }[]
}

/** A finished session's feedback, for the club's Feedback page. */
export interface FeedbackSessionResult {
  sessionId: string
  label: string
  sportId: SportId
  endedAt: string
  responses: number
  /** Players who could answer (everyone on its roster). */
  players: number
  questions: FeedbackQuestionResult[]
}

/** The club's Feedback page (`GET /api/clubs/:id/feedback`): its form and each recent session's results. */
export interface ClubFeedbackView {
  form: FeedbackFormView
  sessions: FeedbackSessionResult[]
}

/** A finished session a member played in and can still answer for. */
export interface FeedbackPromptView {
  sessionId: string
  label: string
  sportId: SportId
  endedAt: string
  /** They already answered: shown as done. */
  answered: boolean
}

/** What a member is asked (`GET /api/directory/:handle/feedback`): the form, while it's on, and their recent sessions. */
export interface MemberFeedbackView {
  form: FeedbackFormView | null
  sessions: FeedbackPromptView[]
}
