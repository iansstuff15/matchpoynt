import type { FeedbackQuestionKind } from '../types/club.ts'
import type { FeedbackFormInput } from '../interfaces/Feedback.ts'

/** Club feedback forms: limits the form builder shows and the API enforces. */
export const feedbackLimits = {
  titleMaxLength: 80,
  introMaxLength: 500,
  maxQuestions: 12,
  promptMaxLength: 200,
  /** Answers a choice question offers. */
  minOptions: 2,
  maxOptions: 6,
  optionMaxLength: 60,
  textAnswerMaxLength: 1000,
  /** Highest score on a rating question (1 to this). */
  ratingMax: 5,
  /** Days after a session ends that its players can still answer. */
  answerWindowDays: 14,
  /** Finished sessions the owner's results page lists. */
  sessionsShown: 20,
  /** Written answers shown per question on the results page. */
  textsShown: 50,
}

/** The kinds of question, as the form builder offers them. */
export const feedbackQuestionKinds: Record<FeedbackQuestionKind, { label: string; description: string }> = {
  rating: { label: 'Rating', description: `A score from 1 to ${feedbackLimits.ratingMax}.` },
  choice: { label: 'Multiple choice', description: 'One answer from a list you write.' },
  yes_no: { label: 'Yes or no', description: 'A yes or a no.' },
  text: { label: 'Written answer', description: 'Anything they want to say.' },
}

/** The form a club starts with until its owner changes it (off until they turn it on). */
export const defaultFeedbackForm = (): FeedbackFormInput => ({
  title: 'How was the session?',
  intro: 'Thanks for playing. Tell us how it went so the next one is even better.',
  enabled: false,
  questions: [
    { id: 'overall', kind: 'rating', prompt: 'How would you rate the session overall?', required: true, options: [] },
    { id: 'matches', kind: 'choice', prompt: 'How were your matches?', required: false, options: ['Too easy', 'About right', 'Too hard'] },
    { id: 'again', kind: 'yes_no', prompt: 'Would you come again?', required: false, options: [] },
    { id: 'comments', kind: 'text', prompt: 'Anything we could do better?', required: false, options: [] },
  ],
})

