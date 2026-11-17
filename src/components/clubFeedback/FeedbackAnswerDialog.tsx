import type { FeedbackFormView, FeedbackPromptView } from '@matchpoynt/shared'
import FeedbackAnswerForm from '@/components/clubFeedback/FeedbackAnswerForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FeedbackAnswerDialogProps {
  handle: string
  form: FeedbackFormView
  /** The session being answered for; `null` closes the dialog. */
  session: FeedbackPromptView | null
  onClose: () => void
}

/** A club's feedback form for one session a member played in. */
export default function FeedbackAnswerDialog({ session, onClose, form, ...props }: FeedbackAnswerDialogProps) {
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{form.title}</DialogTitle>
          <DialogDescription>
            {session?.label}
            {form.intro ? ` · ${form.intro}` : ''}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per session, so the answers start empty each time it opens. */}
        {session && <FeedbackAnswerForm key={session.sessionId} handle={props.handle} form={form} session={session} onSent={onClose} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
