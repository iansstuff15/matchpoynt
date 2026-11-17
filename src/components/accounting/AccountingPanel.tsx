import type { CurrencyCode } from '@matchpoynt/shared'
import { ChartColumn, CircleDollarSign, Hourglass, PiggyBank, Wallet } from 'lucide-react'
import { useId, useState } from 'react'
import AccountingSkeleton from '@/components/accounting/AccountingSkeleton'
import AccountingTile from '@/components/accounting/AccountingTile'
import BillerSpendList from '@/components/accounting/BillerSpendList'
import DateRangeFilter from '@/components/accounting/DateRangeFilter'
import MonthlyChart from '@/components/accounting/MonthlyChart'
import MonthlyTable from '@/components/accounting/MonthlyTable'
import SessionProfitTable from '@/components/accounting/SessionProfitTable'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/utils/forms/money'
import { useAccountingSummary } from '@/utils/hooks/useAccounting'
import { useDateRange } from '@/utils/hooks/useDateRange'
import { useFeatures } from '@/utils/hooks/useFeatures'

/**
 * Accounting tab: the club's earnings for a period. What was collected from
 * session invoices less what was spent, month by month, per session and per
 * biller. Every figure comes from the API.
 */
export default function AccountingPanel({ clubId }: { clubId: string }) {
  const { web } = useFeatures()
  const dates = useDateRange()
  const summary = useAccountingSummary(clubId, dates.range)
  const currencyId = useId()
  const [picked, setPicked] = useState<CurrencyCode | null>(null)
  const views = summary.data?.currencies ?? []
  const view = views.find((v) => v.currency === picked) ?? views[0]
  const money = (minor: number) => (view ? formatMoney(minor, view.currency) : '')

  return (
    <section aria-labelledby="club-accounting-title" className="space-y-6">
      <div>
        <h2 id="club-accounting-title" className="font-display text-xl font-semibold">
          Accounting
        </h2>
        <p className="text-sm text-muted-foreground">
          {web.fees
            ? 'Earnings are what was collected from session invoices, less expenses, on the days the money moved.'
            : 'Fees are switched off, so only expenses are counted.'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter filter={dates} />
        {views.length > 1 && (
          <div className="grid gap-1.5">
            <Label htmlFor={currencyId}>Currency</Label>
            <Select value={view?.currency} onValueChange={(c) => setPicked(c as CurrencyCode)}>
              <SelectTrigger id={currencyId} className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {views.map((v) => (
                  <SelectItem key={v.currency} value={v.currency}>
                    {v.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {summary.isError ? (
        <ErrorBanner error={summary.error} action="load the accounting dashboard" onRetry={() => void summary.refetch()} />
      ) : summary.isPending ? (
        <AccountingSkeleton />
      ) : !view ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChartColumn />
            </EmptyMedia>
            <EmptyTitle>Nothing to count yet</EmptyTitle>
            <EmptyDescription>Charge a fee on the club's sessions, or add an expense, and the club's earnings show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-6" aria-busy={summary.isFetching}>
          <div className="accounting-tiles">
            <AccountingTile label="Net earnings" icon={PiggyBank} value={money(view.totals.net)} note="Collected less spent" />
            <AccountingTile label="Collected" icon={CircleDollarSign} value={money(view.totals.collected)} note={`Of ${money(view.totals.invoiced)} invoiced`} />
            <AccountingTile label="Spent" icon={Wallet} value={money(view.totals.expenses)} note={`${money(view.globalExpenses)} club-wide · ${money(view.totals.expenses - view.globalExpenses)} on sessions`} />
            <AccountingTile label="Still owed" icon={Hourglass} value={money(view.totals.outstanding)} note="Unpaid invoices from these sessions" />
          </div>

          <Card>
            <CardContent className="grid gap-6">
              <MonthlyChart months={view.months} currency={view.currency} />
              <MonthlyTable months={view.months} currency={view.currency} />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">By session</CardTitle>
                <CardDescription>Each session's invoices less its own expenses.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.sessions.length ? (
                  <SessionProfitTable sessions={view.sessions} currency={view.currency} />
                ) : (
                  <p className="text-sm text-muted-foreground">No club sessions with fees or expenses in this period.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display">By biller</CardTitle>
                <CardDescription>Where the money went.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.billers.length ? <BillerSpendList billers={view.billers} currency={view.currency} /> : <p className="text-sm text-muted-foreground">No expenses in this period.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  )
}
