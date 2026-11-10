import RadioCard from '@/components/common/RadioCard'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { sports } from '@/config/sports'
import type { MatchFormat, SessionSetupInput } from '@matchpoynt/shared'
import { describeMatchFormat, describeScoring } from '@/utils/scoring/describe'

interface ScoringStepProps {
  setup: SessionSetupInput
  onChange: (setup: SessionSetupInput) => void
}

export default function ScoringStep({ setup, onChange }: ScoringStepProps) {
  const sport = sports[setup.sportId]
  const format = sport.scoring.find((f) => f.id === setup.scoring.formatId)

  const selectFormat = (formatId: string) => {
    const next = sport.scoring.find((f) => f.id === formatId)
    if (!next) return
    // Keep the match type if the new format allows it.
    const matchFormat = next.formats.includes(setup.scoring.matchFormat)
      ? setup.scoring.matchFormat
      : (next.formats[0] ?? setup.scoring.matchFormat)
    onChange({ ...setup, scoring: { formatId, matchFormat } })
  }

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>{sport.name} scoring format</legend>
        </Label>
        <RadioGroup value={setup.scoring.formatId} onValueChange={selectFormat}>
          {sport.scoring.map((f) => (
            <RadioCard key={f.id} value={f.id} title={f.label} description={describeScoring(f, sport)} />
          ))}
        </RadioGroup>
      </fieldset>

      {format && (
        <fieldset className="grid gap-2">
          <Label asChild>
            <legend>Match type</legend>
          </Label>
          <RadioGroup
            value={setup.scoring.matchFormat}
            onValueChange={(v) => onChange({ ...setup, scoring: { ...setup.scoring, matchFormat: v as MatchFormat } })}
            className="sm:grid-cols-3"
          >
            {format.formats.map((mf) => (
              <RadioCard key={mf} value={mf} title={describeMatchFormat(mf, sport)} />
            ))}
          </RadioGroup>
        </fieldset>
      )}
    </div>
  )
}
