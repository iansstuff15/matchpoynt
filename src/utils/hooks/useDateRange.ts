import { useSearchParams } from 'react-router'
import { datePresets, defaultPreset, presetRange, type DatePreset, type DateRange } from '@/utils/forms/dateRange'
import { recall, remember } from '@/utils/platform/remember'

const isPreset = (value: string | null | undefined): value is DatePreset => datePresets.some((p) => p.id === value)

/** The period picked last in this browser: a preset, or custom days ("custom|from|to"). */
function remembered(): { preset: DatePreset; from: string; to: string } | null {
  const [preset, from = '', to = ''] = (recall('period') ?? '').split('|')
  return isPreset(preset) ? { preset, from, to } : null
}

/**
 * The accounting date filter (Invoices, Expenses, Accounting). It lives in the
 * address (`?period=…`, and `from`/`to` for custom dates) so it can be shared,
 * and this browser remembers the last one picked, so moving between those
 * pages keeps it.
 */
export function useDateRange() {
  const [params, setParams] = useSearchParams()
  const asked = params.get('period')
  const last = isPreset(asked) ? null : remembered()
  const preset: DatePreset = isPreset(asked) ? asked : (last?.preset ?? defaultPreset)
  const range: DateRange =
    preset !== 'custom' ? presetRange(preset) : isPreset(asked) ? { from: params.get('from') ?? '', to: params.get('to') ?? '' } : { from: last?.from ?? '', to: last?.to ?? '' }

  const update = (next: { period: DatePreset; from?: string; to?: string }) => {
    remember('period', next.period === 'custom' ? `custom|${next.from ?? ''}|${next.to ?? ''}` : next.period)
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        out.set('period', next.period)
        for (const key of ['from', 'to'] as const) {
          if (next[key]) out.set(key, next[key]!)
          else out.delete(key)
        }
        return out
      },
      { replace: true },
    )
  }

  return {
    preset,
    range,
    /** Picks a preset; "Custom dates" starts from the range on screen. */
    setPreset: (next: DatePreset) => update(next === 'custom' ? { period: 'custom', from: range.from, to: range.to } : { period: next }),
    setCustom: (patch: Partial<DateRange>) => update({ period: 'custom', from: patch.from ?? range.from, to: patch.to ?? range.to }),
  }
}
