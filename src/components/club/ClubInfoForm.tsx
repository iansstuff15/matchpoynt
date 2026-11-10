import { clubLimits, type ClubInfoInput } from '@matchpoynt/shared'
import { Check, LoaderCircle, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ClubInfoFormProps {
  initial: ClubInfoInput
  pending: boolean
  /** The last failed save. The API decides what's valid. */
  error: unknown
  /** Completes "Couldn't …" in the error banner. */
  action: string
  submitLabel: string
  submitIcon?: LucideIcon
  onSubmit: (info: ClubInfoInput) => void
  onCancel?: () => void
}

/** A club's name and description, for creating a club and editing it. */
export default function ClubInfoForm({ initial, pending, error, action, submitLabel, submitIcon: SubmitIcon = Check, onSubmit, onCancel }: ClubInfoFormProps) {
  const [info, setInfo] = useState(initial)
  const nameId = useId()
  const descriptionId = useId()
  const submit = () => onSubmit(info)

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action={action} onRetry={pending ? undefined : submit} />}
      <div className="grid gap-2">
        <Label htmlFor={nameId}>Club name</Label>
        <Input
          id={nameId}
          value={info.name}
          maxLength={clubLimits.nameMaxLength}
          autoComplete="organization"
          placeholder="e.g. Riverside Smash Club"
          onChange={(e) => setInfo({ ...info, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          value={info.description ?? ''}
          maxLength={clubLimits.descriptionMaxLength}
          rows={4}
          placeholder="Where and when you play, who it's for, how to join."
          onChange={(e) => setInfo({ ...info, description: e.target.value })}
        />
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {(info.description ?? '').length} / {clubLimits.descriptionMaxLength}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <SubmitIcon />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
