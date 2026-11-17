import { feeDefaults, type ClubView, type ExpenseInput, type ExpenseView } from '@matchpoynt/shared'
import { ChevronDown, Plus, Wallet } from 'lucide-react'
import { useId, useState } from 'react'
import DateRangeFilter from '@/components/accounting/DateRangeFilter'
import ExpenseDialog from '@/components/accounting/ExpenseDialog'
import ExpenseTable from '@/components/accounting/ExpenseTable'
import ExpenseTableSkeleton from '@/components/accounting/ExpenseTableSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { expenseScopes } from '@/config/accounting'
import { sports } from '@/config/sports'
import { toDay } from '@/utils/forms/dateRange'
import { formatMoney } from '@/utils/forms/money'
import { useAccountingActions, useBillers, useExpenses } from '@/utils/hooks/useAccounting'
import { useDateRange } from '@/utils/hooks/useDateRange'

const anyBiller = 'all'

/** Expenses tab: the club's spending for a period, club-wide and per session, with who was paid. */
export default function ExpensesPanel({ view }: { view: ClubView }) {
  const clubId = view.club.id
  const dates = useDateRange()
  const [biller, setBiller] = useState(anyBiller)
  const [scope, setScope] = useState('all')
  const ids = { biller: useId(), scope: useId() }
  const billers = useBillers(clubId)
  const expenses = useExpenses(clubId, { ...dates.range, biller: biller === anyBiller ? '' : biller, scope: scope === 'all' ? '' : scope })
  const { addExpense, updateExpense, deleteExpense } = useAccountingActions(clubId)
  // `null` while closed; `'new'` to add; an expense to edit.
  const [editing, setEditing] = useState<ExpenseView | 'new' | null>(null)
  // A new expense starts today, in the club's fee currency; made when the dialog opens.
  const [blank, setBlank] = useState<ExpenseInput | null>(null)
  const save = editing === 'new' ? addExpense : updateExpense
  const open = (next: ExpenseView | 'new') => {
    addExpense.reset()
    updateExpense.reset()
    if (next === 'new') {
      setBlank({ description: '', amount: 0, currency: view.club.fee?.currency ?? feeDefaults.currency, spentOn: toDay(new Date()), billerId: null, sessionId: null, notes: null })
    }
    setEditing(next)
  }
  const list = expenses.data?.pages.flatMap((p) => p.expenses) ?? []
  // Count and totals cover every matching expense, not just the pages loaded.
  const first = expenses.data?.pages[0]

  return (
    <section aria-labelledby="club-expenses-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="club-expenses-title" className="font-display text-xl font-semibold">
            Expenses
          </h2>
          <p className="text-sm text-muted-foreground">What the club spends, for the whole club or one session. It comes off the club's earnings.</p>
        </div>
        <Button onClick={() => open('new')}>
          <Plus />
          Add expense
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter filter={dates} />
        <div className="grid gap-1.5">
          <Label htmlFor={ids.scope}>For</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id={ids.scope} className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expenseScopes.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
              {view.sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title ?? `${sports[s.sportId].name} session`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.biller}>Biller</Label>
          <Select value={biller} onValueChange={setBiller}>
            <SelectTrigger id={ids.biller} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={anyBiller}>Every biller</SelectItem>
              {(billers.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {Boolean(deleteExpense.error) && deleteExpense.variables && (
        <ErrorBanner error={deleteExpense.error} action={`delete ${deleteExpense.variables.description}`} onRetry={() => deleteExpense.variables && deleteExpense.mutate(deleteExpense.variables)} />
      )}
      {expenses.isError ? (
        <ErrorBanner error={expenses.error} action="load the club's expenses" onRetry={() => void expenses.refetch()} />
      ) : expenses.isPending ? (
        <>
          <Skeleton className="h-5 w-64" />
          <ExpenseTableSkeleton />
        </>
      ) : list.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No expenses for these filters</EmptyTitle>
            <EmptyDescription>Add what the club spends, or pick another period.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-sm tabular-nums" aria-live="polite">
            <span className="text-muted-foreground">
              {first?.count ?? list.length} {first?.count === 1 ? 'expense' : 'expenses'} ·{' '}
            </span>
            <span className="font-semibold">Total {(first?.totals ?? []).map((t) => formatMoney(t.amount, t.currency)).join(' + ')}</span>
            {first && list.length < first.count && <span className="text-muted-foreground"> · showing the newest {list.length}</span>}
          </p>
          <ExpenseTable clubId={clubId} expenses={list} />
          {expenses.hasNextPage && (
            <Button variant="outline" className="mx-auto flex" disabled={expenses.isFetchingNextPage} onClick={() => void expenses.fetchNextPage()}>
              <ChevronDown />
              Show older expenses
            </Button>
          )}
        </>
      )}

      <ExpenseDialog
        open={editing !== null && (editing !== 'new' || blank !== null)}
        editing={editing !== 'new' && editing !== null}
        initial={editing !== 'new' && editing !== null ? editing : (blank ?? ({} as ExpenseInput))}
        billers={billers.data ?? []}
        sessions={view.sessions}
        pending={save.isPending}
        error={save.error}
        onOpenChange={(next) => !next && setEditing(null)}
        onSubmit={(expense) => {
          const done = { onSuccess: () => setEditing(null) }
          if (editing === 'new') addExpense.mutate(expense, done)
          else if (editing) updateExpense.mutate({ id: editing.id, expense }, done)
        }}
      />
    </section>
  )
}
