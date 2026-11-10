import { clubBadgeLimits, clubBadgeMetrics, type ClubBadgeCondition, type ClubBadgeMetric, type ClubBadgeScope } from '@matchpoynt/shared'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BadgeConditionsFieldProps {
  scope: ClubBadgeScope
  conditions: ClubBadgeCondition[]
  onChange: (conditions: ClubBadgeCondition[]) => void
}

const metricsFor = (scope: ClubBadgeScope) => (Object.keys(clubBadgeMetrics) as ClubBadgeMetric[]).filter((m) => clubBadgeMetrics[m].scopes.includes(scope))

/**
 * The badge's conditions, each "at least <number> <metric>". Only shapes the
 * draft: which conditions are valid, and who meets them, is up to the API.
 */
export default function BadgeConditionsField({ scope, conditions, onChange }: BadgeConditionsFieldProps) {
  const options = metricsFor(scope)
  const unused = options.filter((m) => !conditions.some((c) => c.metric === m))
  const set = (i: number, next: Partial<ClubBadgeCondition>) => onChange(conditions.map((c, j) => (j === i ? { ...c, ...next } : c)))

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Conditions (all must be met)</legend>
      <ul className="grid gap-2">
        {conditions.map((c, i) => {
          const label = clubBadgeMetrics[c.metric]?.label ?? c.metric
          return (
            <li key={i} className="badge-condition-row">
              <span className="text-sm text-muted-foreground">At least</span>
              <Input
                type="number"
                inputMode="numeric"
                value={Number.isNaN(c.min) ? '' : c.min}
                onChange={(e) => set(i, { min: e.target.valueAsNumber })}
                aria-label={`Minimum ${label.toLowerCase()}`}
                className="w-24 tabular-nums"
              />
              <Select value={c.metric} onValueChange={(metric) => set(i, { metric: metric as ClubBadgeMetric })}>
                <SelectTrigger className="min-w-44 flex-1" aria-label={`Condition ${i + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options
                    .filter((m) => m === c.metric || !conditions.some((o) => o.metric === m))
                    .map((m) => (
                      <SelectItem key={m} value={m}>
                        {clubBadgeMetrics[m].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(conditions.filter((_, j) => j !== i))} aria-label={`Remove the ${label.toLowerCase()} condition`}>
                <X />
              </Button>
            </li>
          )
        })}
      </ul>
      {conditions.length < clubBadgeLimits.maxConditions && unused.length > 0 && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...conditions, { metric: unused[0]!, min: 1 }])}>
          <Plus />
          Add condition
        </Button>
      )}
    </fieldset>
  )
}
