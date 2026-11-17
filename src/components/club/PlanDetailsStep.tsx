import { clubLimits, planSignUpModes, signUpLimits, type PlanSignUp } from '@matchpoynt/shared'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PlanDraft } from '@/utils/forms/planDraft'

interface PlanDetailsStepProps {
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
}

/** The plan's own details: a title, when it's on, and how members sign up (with an optional player cap). */
export default function PlanDetailsStep({ draft, onChange }: PlanDetailsStepProps) {
  const titleId = useId()
  const whenId = useId()
  const signUpId = useId()
  const capId = useId()
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
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">How members join</legend>
        <RadioGroup value={draft.signUp} onValueChange={(v) => onChange({ ...draft, signUp: v as PlanSignUp })} className="grid gap-2">
          {(Object.keys(planSignUpModes) as PlanSignUp[]).map((mode) => (
            <Label key={mode} htmlFor={`${signUpId}-${mode}`} className="flex items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary">
              <RadioGroupItem id={`${signUpId}-${mode}`} value={mode} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span className="font-medium">{planSignUpModes[mode].label}</span>
                <span className="text-xs text-muted-foreground">{planSignUpModes[mode].description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={capId}>Player cap (optional)</Label>
        <Input
          id={capId}
          type="number"
          inputMode="numeric"
          min={signUpLimits.minPlayers}
          max={signUpLimits.maxPlayers}
          className="w-32"
          value={draft.maxPlayers}
          placeholder="No cap"
          onChange={(e) => onChange({ ...draft, maxPlayers: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Open sign-up stops when the roster reaches it.</p>
      </div>
    </div>
  )
}
