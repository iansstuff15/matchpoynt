import type { FeedbackAnswer, FeedbackFormInput } from '@matchpoynt/shared'
import { Eye, Send } from 'lucide-react'
import { useState } from 'react'
import FeedbackQuestionField from '@/components/clubFeedback/FeedbackQuestionField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FeedbackPreviewDialogProps {
  /** The form as it stands in the editor (saved or not). */
  form: FeedbackFormInput
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Answers kept here so they reset each time the preview opens. Nothing is sent. */
function PreviewForm({ form, onClose }: { form: FeedbackFormInput; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswer['value']>>({})
  // Shown as members would see it: blank answers to a choice aren't offered.
  const questions = form.questions.map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) }))
  return (
    <div className="grid min-h-0 gap-5">
      <Alert>
        <Eye />
        <AlertDescription>
          This is how members see the form after a session{form.enabled ? '' : ' once you turn it on'}. You can try the answers; nothing is sent.
        </AlertDescription>
      </Alert>
      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a question to see it here.</p>
      ) : (
        questions.map((q, i) => (
          <FeedbackQuestionField
            key={q.id}
            index={i + 1}
            question={{ ...q, prompt: q.prompt.trim() || `Question ${i + 1}` }}
            value={answers[q.id]}
            onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
          />
        ))
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close preview
        </Button>
        <Button type="button" disabled title="Preview only: members send their answers from the club's page">
          <Send />
          Send feedback
        </Button>
      </DialogFooter>
    </div>
  )
}

/** The club's feedback form as members see it, from what's in the editor, to try before (or after) saving. */
export default function FeedbackPreviewDialog({ form, open, onOpenChange }: FeedbackPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{form.title.trim() || 'Feedback form'}</DialogTitle>
          <DialogDescription>
            Preview{form.intro.trim() ? ` · ${form.intro.trim()}` : ''}
          </DialogDescription>
        </DialogHeader>
        {open && <PreviewForm form={form} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
