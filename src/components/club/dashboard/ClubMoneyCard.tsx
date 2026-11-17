import { ArrowRight, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { presetRange } from '@/utils/forms/dateRange'
import { formatMoney } from '@/utils/forms/money'
import { useAccountingSummary } from '@/utils/hooks/useAccounting'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'

/** This month's money at a glance: net earnings, collected, spent and still owed, from the accounting dashboard. */
export default function ClubMoneyCard({ clubId }: { clubId: string }) {
  const summary = useAccountingSummary(clubId, presetRange('this-month'))
  const view = summary.data?.currencies[0]
  const figures = view
    ? [
        { label: 'Net earnings', value: view.totals.net },
        { label: 'Collected', value: view.totals.collected },
        { label: 'Spent', value: view.totals.expenses },
        { label: 'Still owed', value: view.totals.outstanding },
      ]
    : []

  return (
    <Card aria-labelledby="club-dash-money-title">
      <CardHeader>
        <CardTitle id="club-dash-money-title" className="flex items-center gap-2 font-display">
          <Wallet className="size-5" aria-hidden />
          This month
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={clubPageHref(clubId, 'accounting')}>
              Accounting
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <ErrorBanner error={summary.error} action="load this month's figures" onRetry={() => void summary.refetch()} />
        ) : summary.isPending ? (
          <dl className="grid grid-cols-2 gap-4" aria-busy="true" aria-label="Loading this month's figures">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="grid gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </dl>
        ) : !view ? (
          <p className="text-sm text-muted-foreground">
            No money in or out yet.{' '}
            <Link to={clubPageHref(clubId, 'invoices')} className="text-primary hover:underline">
              Create an invoice
            </Link>{' '}
            or{' '}
            <Link to={clubPageHref(clubId, 'expenses')} className="text-primary hover:underline">
              add an expense
            </Link>
            .
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-4" aria-label="This month's figures">
            {figures.map((f) => (
              <div key={f.label} className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="font-display text-lg font-bold tabular-nums">{formatMoney(f.value, view.currency)}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
