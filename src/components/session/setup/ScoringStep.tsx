import type { MatchFormat, ScoringFormat, SessionSetupInput } from '@matchpoynt/shared'
import RadioCard from '@/components/common/RadioCard'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { sports } from '@/config/sports'
import { describeMatchFormat, describeScoring } from '@/utils/scoring/describe'

interface ScoringStepProps {
  setup: SessionSetupInput
  onChange: (setup: SessionSetupInput) => void
}

/** The sport's formats in order, with formats sharing a group (e.g. races to different ceilings) kept together. */
function groupFormats(formats: ScoringFormat[]): { name: string | null; formats: ScoringFormat[] }[] {
  const groups: { name: string | null; formats: ScoringFormat[] }[] = []
  for (const format of formats) {
    const last = groups.at(-1)
    if (format.group && last?.name === format.group) last.formats.push(format)
    else groups.push({ name: format.group ?? null, formats: [format] })
  }
  return groups
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
          {groupFormats(sport.scoring).map((group) =>
            group.name ? (
              // A group of formats (e.g. a race with a choice of ceilings): its variants side by side under its name.
              <div key={group.name} role="group" aria-label={group.name} className="grid gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{group.name}</p>
                {group.formats[0]!.groupDescription && <p className="text-sm text-muted-foreground">{group.formats[0]!.groupDescription}</p>}
                <div className="grid gap-2 sm:grid-cols-3">
                  {group.formats.map((f) => (
                    <RadioCard key={f.id} value={f.id} title={f.variant ?? f.label} />
                  ))}
                </div>
              </div>
            ) : (
              <RadioCard key={group.formats[0]!.id} value={group.formats[0]!.id} title={group.formats[0]!.label} description={describeScoring(group.formats[0]!, sport)} />
            ),
          )}
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
