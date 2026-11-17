// The accounting date filter's presets, turned into the days they cover on
// the viewer's calendar. Form state only: the API checks the range and does
// every sum, counting days in the viewer's time zone (`viewerTimeZone`).

export const datePresets = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'this-year', label: 'This year' },
  { id: 'last-12-months', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom dates' },
] as const

export type DatePreset = (typeof datePresets)[number]['id']

export const defaultPreset: DatePreset = 'this-year'

export interface DateRange {
  /** YYYY-MM-DD, inclusive; empty for open-ended. */
  from: string
  to: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A date as YYYY-MM-DD on the viewer's calendar. */
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The days a preset covers, as of `today`. "All time" is open at both ends. */
export function presetRange(preset: Exclude<DatePreset, 'custom'>, today = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const day = (year: number, month: number, date: number) => toDay(new Date(year, month, date))
  switch (preset) {
    case 'this-month':
      return { from: day(y, m, 1), to: day(y, m + 1, 0) }
    case 'last-month':
      return { from: day(y, m - 1, 1), to: day(y, m, 0) }
    case 'last-3-months':
      return { from: day(y, m - 2, 1), to: day(y, m + 1, 0) }
    case 'this-year':
      return { from: day(y, 0, 1), to: day(y, 11, 31) }
    case 'last-12-months':
      return { from: day(y, m - 11, 1), to: day(y, m + 1, 0) }
    case 'all':
      return { from: '', to: '' }
  }
}

/** The viewer's time zone (IANA name), so the API counts days and months as they do. */
export const viewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

/** The range as query parameters: only the ends that are set. */
export function rangeQuery({ from, to }: DateRange): Record<string, string> {
  return { ...(from && { from }), ...(to && { to }) }
}
