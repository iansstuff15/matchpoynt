import type { AccountingMonthView, CurrencyCode } from '@matchpoynt/shared'
import { useState } from 'react'
import { accountingSeries, chartMaxMonthLabels } from '@/config/accounting'
import { formatMoney, formatMoneyShort } from '@/utils/forms/money'

interface MonthlyChartProps {
  months: AccountingMonthView[]
  currency: CurrencyCode
}

/**
 * Collected and spent, month by month, as pairs of thin bars on one axis.
 * Hovering or focusing a month shows its figures and net earnings; the
 * monthly table beside it has every value too.
 */
export default function MonthlyChart({ months, currency }: MonthlyChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...months.flatMap((m) => [m.collected, m.expenses]))
  const ticks = [max, max / 2, 0]
  const every = Math.ceil(months.length / chartMaxMonthLabels)
  const money = (minor: number) => formatMoney(minor, currency)
  const shown = active === null ? null : months[active]

  return (
    <figure className="grid gap-3" aria-labelledby="monthly-chart-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption id="monthly-chart-title" className="text-sm font-medium">
          Collected and spent by month
        </figcaption>
        <ul className="flex gap-4 text-xs text-muted-foreground" aria-label="Legend">
          {accountingSeries.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="accounting-chart-key" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="accounting-chart">
        <div className="accounting-chart-axis" aria-hidden>
          {ticks.map((t, i) => (
            <span key={i}>{formatMoneyShort(t, currency)}</span>
          ))}
        </div>
        <div className="accounting-chart-plot" onMouseLeave={() => setActive(null)}>
          <span className="accounting-chart-grid top-0" aria-hidden />
          <span className="accounting-chart-grid top-1/2" aria-hidden />
          <ul className="contents" aria-label="Months">
            {months.map((m, i) => (
              <li
                key={m.month}
                tabIndex={0}
                className="accounting-chart-month"
                data-active={active === i}
                aria-label={`${m.label}: collected ${money(m.collected)}, spent ${money(m.expenses)}, net ${money(m.net)}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {accountingSeries.map((s) => (
                  <span key={s.key} className="accounting-chart-bar" style={{ height: `${(m[s.key] / max) * 100}%`, background: s.color }} aria-hidden />
                ))}
              </li>
            ))}
          </ul>
          {shown && (
            <div className="accounting-chart-tooltip" style={{ left: `clamp(5.5rem, ${((active! + 0.5) / months.length) * 100}%, calc(100% - 5.5rem))` }} aria-hidden>
              <span className="font-medium">{shown.label}</span>
              {accountingSeries.map((s) => (
                <span key={s.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="accounting-chart-key" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <strong className="tabular-nums">{money(shown[s.key])}</strong>
                </span>
              ))}
              <span className="flex items-center justify-between gap-3 border-t pt-1">
                <span className="text-muted-foreground">Net</span>
                <strong className="tabular-nums">{money(shown.net)}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="accounting-chart-labels" aria-hidden>
          {months.map((m, i) => (
            <span key={m.month}>{i % every !== 0 ? '' : i === 0 || m.month.endsWith('-01') ? m.label : m.label.split(' ')[0]}</span>
          ))}
        </div>
      </div>
    </figure>
  )
}
