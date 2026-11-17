import { CalendarRange } from 'lucide-react'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { datePresets, type DatePreset } from '@/utils/forms/dateRange'
import type { useDateRange } from '@/utils/hooks/useDateRange'

/** The accounting date filter: a preset period, or custom start and end days. */
export default function DateRangeFilter({ filter }: { filter: ReturnType<typeof useDateRange> }) {
  const periodId = useId()
  const fromId = useId()
  const toId = useId()
  const { preset, range, setPreset, setCustom } = filter

  return (
    <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Dates">
      <div className="grid gap-1.5">
        <Label htmlFor={periodId}>Period</Label>
        <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger id={periodId} className="w-44">
            <CalendarRange aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor={fromId}>From</Label>
            <Input id={fromId} type="date" className="w-40" value={range.from} max={range.to || undefined} onChange={(e) => setCustom({ from: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={toId}>To</Label>
            <Input id={toId} type="date" className="w-40" value={range.to} min={range.from || undefined} onChange={(e) => setCustom({ to: e.target.value })} />
          </div>
        </>
      )}
    </div>
  )
}
