import { announcementLimits, type ClubAnnouncementInput } from '@matchpoynt/shared'
import { Check, LoaderCircle, Send } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface AnnouncementDialogProps {
  open: boolean
  /** `null` posts a new announcement. */
  initial: ClubAnnouncementInput | null
  /** Why it can't be pinned (from the API), or `null`. An announcement already pinned can stay pinned. */
  pinBlockedReason: string | null
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ClubAnnouncementInput) => void
}

/** Draft state lives here, so it resets each time the dialog opens. */
function AnnouncementForm({ initial, pinBlockedReason, pending, error, onSubmit, onCancel }: Omit<AnnouncementDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [draft, setDraft] = useState<ClubAnnouncementInput>(initial ?? { title: '', body: '', pinned: false })
  const ids = { title: useId(), body: useId(), pinned: useId() }
  const posting = initial === null
  const pinLocked = !initial?.pinned && pinBlockedReason !== null
  const submit = () => onSubmit(draft)

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action={posting ? 'post the announcement' : 'save the announcement'} onRetry={pending ? undefined : submit} />}
      <div className="grid gap-2">
        <Label htmlFor={ids.title}>Title</Label>
        <Input id={ids.title} value={draft.title} maxLength={announcementLimits.titleMaxLength} autoComplete="off" placeholder="e.g. Courts 3 and 4 this Friday" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.body}>Message (optional)</Label>
        <Textarea id={ids.body} value={draft.body} maxLength={announcementLimits.bodyMaxLength} rows={5} placeholder="What members should know" onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      </div>
      <div className="flex items-center gap-3">
        <Switch id={ids.pinned} checked={draft.pinned} disabled={pinLocked && !draft.pinned} onCheckedChange={(pinned) => setDraft({ ...draft, pinned })} />
        <Label htmlFor={ids.pinned} className="grid gap-0.5 font-normal">
          <span className="font-medium">Pin to the top</span>
          <span className="text-xs text-muted-foreground">{pinLocked ? pinBlockedReason : 'Pinned announcements stay above newer ones.'}</span>
        </Label>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !draft.title.trim()}>
          {pending ? <LoaderCircle className="animate-spin" /> : posting ? <Send /> : <Check />}
          {posting ? 'Post announcement' : 'Save announcement'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Posts or edits a club announcement. */
export default function AnnouncementDialog({ open, onOpenChange, ...formProps }: AnnouncementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{formProps.initial ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          <DialogDescription>Members see it on the club's page, newest first, with pinned ones on top.</DialogDescription>
        </DialogHeader>
        {open && <AnnouncementForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
