import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import ExpenseDetails from '@/components/accounting/ExpenseDetails'
import ExpenseDialog from '@/components/accounting/ExpenseDialog'
import ConfirmButton from '@/components/common/ConfirmButton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/utils/forms/money'
import { useAccountingActions, useBillers, useExpense } from '@/utils/hooks/useAccounting'
import { useClubPage } from '@/utils/hooks/useClubPage'
import { formatDay } from '@/utils/time/formatDay'

/** One expense of the club on its own page (`/clubs/<id>/expenses/<id>`): every detail, editing it and deleting it. */
export default function ClubExpensePage() {
  const { view } = useClubPage()
  const { expenseId = '' } = useParams()
  const navigate = useNavigate()
  const clubId = view.club.id
  const expense = useExpense(clubId, expenseId)
  const billers = useBillers(clubId)
  const { updateExpense, deleteExpense } = useAccountingActions(clubId)
  const [editing, setEditing] = useState(false)
  const back = `/clubs/${clubId}/expenses`
  const e = expense.data

  return (
    <section aria-label="Expense" className="grid gap-4">
      <PageMeta title={`${e?.description ?? 'Expense'} · ${view.club.name}`} description={`An expense of ${view.club.name}: what it was, when, for what and who was paid.`} />
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to={back}>
          <ArrowLeft />
          All expenses
        </Link>
      </Button>
      {Boolean(deleteExpense.error) && <ErrorBanner error={deleteExpense.error} action="delete the expense" onRetry={() => deleteExpense.variables && deleteExpense.mutate(deleteExpense.variables)} />}
      {expense.isError ? (
        <ErrorBanner error={expense.error} action="open this expense" onRetry={() => void expense.refetch()} />
      ) : !e ? (
        <Card aria-busy="true" aria-label="Loading the expense">
          <CardHeader className="gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full max-w-md" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <ExpenseDetails
            expense={e}
            actions={
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  Edit
                </Button>
                <ConfirmButton
                  variant="outline"
                  label="Delete"
                  icon={Trash2}
                  title={`Delete ${e.description}?`}
                  description={`${formatMoney(e.amount, e.currency)} on ${formatDay(e.spentOn)} comes off the club's expenses.`}
                  confirmLabel="Delete expense"
                  pending={deleteExpense.isPending}
                  onConfirm={() => deleteExpense.mutate({ id: e.id, description: e.description }, { onSuccess: () => navigate(back, { replace: true }) })}
                />
              </>
            }
          />
          <ExpenseDialog
            open={editing}
            editing
            initial={e}
            billers={billers.data ?? []}
            sessions={view.sessions}
            pending={updateExpense.isPending}
            error={updateExpense.error}
            onOpenChange={setEditing}
            onSubmit={(input) => updateExpense.mutate({ id: e.id, expense: input }, { onSuccess: () => setEditing(false) })}
          />
        </>
      )}
    </section>
  )
}
