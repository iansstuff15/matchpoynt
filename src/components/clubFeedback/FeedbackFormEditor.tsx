import { feedbackLimits, type FeedbackFormInput, type FeedbackFormView, type FeedbackQuestion } from '@matchpoynt/shared'
import { ClipboardList, LoaderCircle, Plus, Save, Eye } from 'lucide-react'
import { useId, useState } from 'react'
import FeedbackPreviewDialog from '@/components/clubFeedback/FeedbackPreviewDialog'
import FeedbackQuestionEditor from '@/components/clubFeedback/FeedbackQuestionEditor'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useSaveFeedbackForm } from '@/utils/hooks/useClubFeedback'

interface FeedbackFormEditorProps {
  clubId: string
  form: FeedbackFormView
}

const newQuestion = (): FeedbackQuestion => ({ id: crypto.randomUUID(), kind: 'rating', prompt: '', required: false, options: [] })

/**
 * The club's post-session feedback form, built by its owner: a title, an
 * introduction, whether members are asked, and up to
 * `feedbackLimits.maxQuestions` questions, previewed as members see it
 * (`FeedbackPreviewDialog`). The API checks it on save.
 */
export default function FeedbackFormEditor({ clubId, form }: FeedbackFormEditorProps) {
  const [draft, setDraft] = useState<FeedbackFormInput>({ title: form.title, intro: form.intro, enabled: form.enabled, questions: form.questions })
  const save = useSaveFeedbackForm(clubId)
  const [previewing, setPreviewing] = useState(false)
  const titleId = useId()
  const introId = useId()
  const enabledId = useId()
  const submit = () => save.mutate(draft)
  const setQuestion = (i: number, q: FeedbackQuestion) => setDraft({ ...draft, questions: draft.questions.map((x, j) => (j === i ? q : x)) })
  const move = (i: number, by: -1 | 1) => {
    const questions = [...draft.questions]
    const [q] = questions.splice(i, 1)
    questions.splice(i + by, 0, q!)
    setDraft({ ...draft, questions })
  }

  return (
    <Card aria-labelledby="feedback-form-title">
      <form
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <CardHeader>
          <CardTitle id="feedback-form-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
            <ClipboardList className="size-5" aria-hidden />
            Feedback form
          </CardTitle>
          <CardDescription>
            One form for the whole club. Members who played answer it from the club's page for {feedbackLimits.answerWindowDays} days after each session.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {Boolean(save.error) && <ErrorBanner error={save.error} action="save the feedback form" onRetry={save.isPending ? undefined : submit} />}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch id={enabledId} checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
            <Label htmlFor={enabledId} className="grid gap-0.5 font-normal">
              <span className="font-medium">Ask members after each session</span>
              <span className="text-xs text-muted-foreground">{draft.enabled ? 'On: members see the form on the club page.' : 'Off: nobody is asked until you turn it on.'}</span>
            </Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={titleId}>Title</Label>
              <Input id={titleId} value={draft.title} maxLength={feedbackLimits.titleMaxLength} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor={introId}>Introduction (optional)</Label>
              <Textarea id={introId} rows={2} value={draft.intro} maxLength={feedbackLimits.introMaxLength} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
            </div>
          </div>
          <ol className="grid gap-3" aria-label="Questions">
            {draft.questions.map((q, i) => (
              <FeedbackQuestionEditor
                key={q.id}
                question={q}
                index={i}
                count={draft.questions.length}
                onChange={(next) => setQuestion(i, next)}
                onMove={(by) => move(i, by)}
                onRemove={() => setDraft({ ...draft, questions: draft.questions.filter((_, j) => j !== i) })}
              />
            ))}
          </ol>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={draft.questions.length >= feedbackLimits.maxQuestions}
            title={draft.questions.length >= feedbackLimits.maxQuestions ? `A form can ask up to ${feedbackLimits.maxQuestions} questions` : undefined}
            onClick={() => setDraft({ ...draft, questions: [...draft.questions, newQuestion()] })}
          >
            <Plus />
            Add a question
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setPreviewing(true)} title="See the form as members will">
              <Eye />
              Preview
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save form
            </Button>
          </div>
        </CardFooter>
      </form>
      <FeedbackPreviewDialog form={draft} open={previewing} onOpenChange={setPreviewing} />
    </Card>
  )
}
