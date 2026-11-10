import RadioCard from '@/components/common/RadioCard'
import { RadioGroup } from '@/components/ui/radio-group'
import { matchmakingStrategies } from '@/config/matchmaking'
import type { MatchmakingStrategyId, SessionSetupInput } from '@matchpoynt/shared'

interface MatchmakingStepProps {
  setup: SessionSetupInput
  onChange: (setup: SessionSetupInput) => void
}

export default function MatchmakingStep({ setup, onChange }: MatchmakingStepProps) {
  return (
    <div className="grid gap-3">
      {setup.rules.queueing === 'manual' && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Queueing is manual, so this is only used if you turn automatic queueing back on.
        </p>
      )}
      <RadioGroup
      aria-label="Matchmaking algorithm"
      value={setup.matchmaking}
      onValueChange={(v) => onChange({ ...setup, matchmaking: v as MatchmakingStrategyId })}
    >
      {matchmakingStrategies.map(({ id, label, description, icon }) => (
        <RadioCard key={id} value={id} title={label} description={description} icon={icon} />
      ))}
      </RadioGroup>
    </div>
  )
}
