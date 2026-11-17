import { accountingLimits, type BillerInput } from '@matchpoynt/shared'
import { Check, LoaderCircle, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface BillerDialogProps {
  open: boolean
  /** `null` adds a new biller. */
  initial: BillerInput | null
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (biller: BillerInput) => void
}

/** Draft state lives here, so it resets each time the dialog opens. */
function BillerForm({ initial, pending, error, onSubmit, onCancel }: Omit<BillerDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [biller, setBiller] = useState<BillerInput>(initial ?? { name: '', contact: null, notes: null })
  const ids = { name: useId(), contact: useId(), notes: useId() }
  const adding = initial === null
  const submit = () => onSubmit(biller)

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action={adding ? 'add the biller' : 'save the biller'} onRetry={pending ? undefined : submit} />}
      <div className="grid gap-2">
        <Label htmlFor={ids.name}>Name</Label>
        <Input id={ids.name} value={biller.name} maxLength={accountingLimits.billerNameMaxLength} autoComplete="off" placeholder="e.g. City Sports Hall" onChange={(e) => setBiller({ ...biller, name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.contact}>Contact (optional)</Label>
        <Input id={ids.contact} value={biller.contact ?? ''} maxLength={accountingLimits.contactMaxLength} autoComplete="off" placeholder="Email, phone or address" onChange={(e) => setBiller({ ...biller, contact: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.notes}>Notes (optional)</Label>
        <Textarea id={ids.notes} value={biller.notes ?? ''} maxLength={accountingLimits.notesMaxLength} rows={3} placeholder="Account number, payment terms…" onChange={(e) => setBiller({ ...biller, notes: e.target.value })} />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : adding ? <Plus /> : <Check />}
          {adding ? 'Add biller' : 'Save biller'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Adds or edits a biller: someone the club pays. */
export default function BillerDialog({ open, onOpenChange, ...formProps }: BillerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{formProps.initial ? `Edit ${formProps.initial.name}` : 'Add a biller'}</DialogTitle>
          <DialogDescription>Someone the club pays, like a venue, a supplier or a coach. Link expenses to them.</DialogDescription>
        </DialogHeader>
        {open && <BillerForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
