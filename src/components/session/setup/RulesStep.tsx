import { useId } from 'react'
import RadioCard from '@/components/common/RadioCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { sessionDefaults, type LateJoinerPlacement, type QueueingMode, type SessionRules, type SessionSetupInput } from '@matchpoynt/shared'

interface RulesStepProps {
  setup: SessionSetupInput
  onChange: (setup: SessionSetupInput) => void
}

export default function RulesStep({ setup, onChange }: RulesStepProps) {
  const autoFillId = useId()
  const limitId = useId()
  const minutesId = useId()
  const { rules } = setup
  const setRules = (patch: Partial<SessionRules>) => onChange({ ...setup, rules: { ...rules, ...patch } })
  const hasLimit = rules.timeLimitMinutes !== null

  const automatic = rules.queueing === 'automatic'

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>Queueing</legend>
        </Label>
        <RadioGroup value={rules.queueing} onValueChange={(v) => setRules({ queueing: v as QueueingMode })} className="sm:grid-cols-2">
          <RadioCard value="automatic" title="Automatic" description="The matchmaking algorithm picks who plays next. You can still drag players onto courts by hand." />
          <RadioCard value="manual" title="Manual" description="You drag every player onto a court. Nothing is picked for you." />
        </RadioGroup>
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="grid gap-1">
          <Label htmlFor={autoFillId}>Fill courts automatically</Label>
          <p className="text-sm text-muted-foreground">
            {automatic
              ? 'When a court opens and enough players are waiting, the next match starts on its own. Courts you are arranging by hand are left alone.'
              : 'Only works with automatic queueing.'}
          </p>
        </div>
        <Switch id={autoFillId} checked={automatic && rules.autoFill} disabled={!automatic} onCheckedChange={(autoFill) => setRules({ autoFill })} />
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <Label htmlFor={limitId}>Match time limit</Label>
            <p className="text-sm text-muted-foreground">Courts show a timer and flag matches that run over.</p>
          </div>
          <Switch
            id={limitId}
            checked={hasLimit}
            onCheckedChange={(on) => setRules({ timeLimitMinutes: on ? sessionDefaults.timeLimitMinutes : null })}
          />
        </div>
        {hasLimit && (
          <div className="flex items-center gap-2">
            <Input
              id={minutesId}
              type="number"
              min={1}
              step={1}
              value={rules.timeLimitMinutes ?? ''}
              onChange={(e) => setRules({ timeLimitMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="w-24"
            />
            <Label htmlFor={minutesId} className="font-normal">
              minutes per match
            </Label>
          </div>
        )}
      </div>

      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>Players who arrive late</legend>
        </Label>
        <RadioGroup value={rules.lateJoiners} onValueChange={(v) => setRules({ lateJoiners: v as LateJoinerPlacement })}>
          <RadioCard
            value="fair"
            title="Join the rotation fairly"
            description="They wait their turn alongside those who have played least, without skipping ahead."
          />
          <RadioCard
            value="priority"
            title="Play next"
            description="They count as having played no games, so they go to the front of the queue."
          />
        </RadioGroup>
      </fieldset>
    </div>
  )
}
