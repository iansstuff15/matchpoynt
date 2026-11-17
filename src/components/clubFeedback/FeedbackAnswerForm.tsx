import type { FeedbackAnswer, FeedbackFormView, FeedbackPromptView } from '@matchpoynt/shared'
import { LoaderCircle, Send } from 'lucide-react'
import { useState } from 'react'
import FeedbackQuestionField from '@/components/clubFeedback/FeedbackQuestionField'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { useSubmitFeedback } from '@/utils/hooks/useClubFeedback'

interface FeedbackAnswerFormProps {
  handle: string
  form: FeedbackFormView
  session: FeedbackPromptView
  /** After the answers are sent. */
  onSent?: () => void
  /** "Not now", where the form can be put away (the dialog). */
  onCancel?: () => void
}

/** A member's answers to the club's feedback form for one session; the API checks them against the form. */
export default function FeedbackAnswerForm({ handle, form, session, onSent, onCancel }: FeedbackAnswerFormProps) {
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswer['value']>>({})
  const submit = useSubmitFeedback(handle)
  const send = () =>
    submit.mutate(
      { sessionId: session.sessionId, label: session.label, answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })) },
      { onSuccess: onSent },
    )
  return (
    <form
      className="grid min-h-0 gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      {Boolean(submit.error) && <ErrorBanner error={submit.error} action={`send your feedback on ${session.label}`} onRetry={submit.isPending ? undefined : send} />}
      {form.questions.map((q, i) => (
        <FeedbackQuestionField key={q.id} index={i + 1} question={q} value={answers[q.id]} onChange={(value) => setAnswers({ ...answers, [q.id]: value })} />
      ))}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Not now
          </Button>
        )}
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
          Send feedback
        </Button>
      </div>
    </form>
  )
}
