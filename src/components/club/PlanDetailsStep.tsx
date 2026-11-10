import { clubLimits } from '@matchpoynt/shared'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PlanDraft } from '@/utils/forms/planDraft'

interface PlanDetailsStepProps {
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
}

/** The plan's own details: a title and when it's on. */
export default function PlanDetailsStep({ draft, onChange }: PlanDetailsStepProps) {
  const titleId = useId()
  const whenId = useId()
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          value={draft.title}
          maxLength={clubLimits.titleMaxLength}
          placeholder="e.g. Thursday open play"
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={whenId}>Date and time (optional)</Label>
        <Input id={whenId} type="datetime-local" className="w-fit" value={draft.scheduledFor} onChange={(e) => onChange({ ...draft, scheduledFor: e.target.value })} />
        <p className="text-xs text-muted-foreground">Plans are listed soonest first. You start the session yourself when play begins.</p>
      </div>
    </div>
  )
}
