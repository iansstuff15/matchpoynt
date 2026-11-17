import { accountingLimits, feeCurrencies, type BillerView, type ClubSessionView, type CurrencyCode, type ExpenseInput } from '@matchpoynt/shared'
import { Building2, CalendarDays, Check, LoaderCircle, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import AmountField from '@/components/fees/AmountField'
import RadioCard from '@/components/common/RadioCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

interface ExpenseDialogProps {
  open: boolean
  /** The expense to edit, or a new one's starting values. */
  initial: ExpenseInput
  editing: boolean
  billers: BillerView[]
  /** The club's sessions, to link an expense to one. */
  sessions: ClubSessionView[]
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (expense: ExpenseInput) => void
}

const noBiller = 'none'
const sessionLabel = (s: ClubSessionView) => s.title ?? `${sports[s.sportId].name} session`

/** Draft state lives here, so it resets each time the dialog opens. */
function ExpenseForm({ initial, editing, billers, sessions, pending, error, onSubmit, onCancel }: Omit<ExpenseDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [expense, setExpense] = useState(initial)
  const ids = { description: useId(), currency: useId(), date: useId(), biller: useId(), session: useId(), notes: useId() }
  const set = (patch: Partial<ExpenseInput>) => setExpense({ ...expense, ...patch })
  const submit = () => onSubmit(expense)
  // Before a session is picked, "A session" is chosen with none yet: the API names it as missing.
  const [forSession, setForSession] = useState(initial.sessionId !== null)

  return (
    <form
      className="grid min-h-0 gap-4 overflow-y-auto pr-1"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action={editing ? 'save the expense' : 'add the expense'} onRetry={pending ? undefined : submit} />}
      <div className="grid gap-2">
        <Label htmlFor={ids.description}>What was it for?</Label>
        <Input id={ids.description} value={expense.description} maxLength={accountingLimits.descriptionMaxLength} autoComplete="off" placeholder="e.g. Court hire, shuttles, prizes" onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AmountField label="Amount" value={expense.amount} currency={expense.currency} onChange={(amount) => set({ amount })} />
        <div className="grid gap-1.5">
          <Label htmlFor={ids.currency}>Currency</Label>
          <Select value={expense.currency} onValueChange={(currency) => set({ currency: currency as CurrencyCode })}>
            <SelectTrigger id={ids.currency} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(feeCurrencies) as CurrencyCode[]).map((code) => (
                <SelectItem key={code} value={code}>
                  {code} · {feeCurrencies[code].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.date}>Date spent</Label>
          <Input id={ids.date} type="date" value={expense.spentOn} onChange={(e) => set({ spentOn: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.biller}>Biller</Label>
          <Select value={expense.billerId ?? noBiller} onValueChange={(v) => set({ billerId: v === noBiller ? null : v })}>
            <SelectTrigger id={ids.biller} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={noBiller}>No biller</SelectItem>
              {billers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>Applies to</legend>
        </Label>
        <RadioGroup
          value={forSession ? 'session' : 'global'}
          onValueChange={(v) => {
            setForSession(v === 'session')
            if (v === 'global') set({ sessionId: null })
          }}
          className="sm:grid-cols-2"
        >
          <RadioCard value="global" title="The whole club" description="Rent, equipment, fees: not tied to one session." icon={Building2} />
          <RadioCard value="session" title="A session" description="Costs of one of the club's sessions." icon={CalendarDays} disabled={sessions.length === 0} />
        </RadioGroup>
        {forSession && (
          <div className="grid gap-1.5">
            <Label htmlFor={ids.session}>Session</Label>
            <Select value={expense.sessionId ?? ''} onValueChange={(sessionId) => set({ sessionId })}>
              <SelectTrigger id={ids.session} className="w-full">
                <SelectValue placeholder="Pick a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {sessionLabel(s)} · {formatWhen(s.startedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={ids.notes}>Notes (optional)</Label>
        <Textarea id={ids.notes} value={expense.notes ?? ''} maxLength={accountingLimits.notesMaxLength} rows={2} placeholder="Receipt number, who paid…" onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : editing ? <Check /> : <Plus />}
          {editing ? 'Save expense' : 'Add expense'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Adds or edits an expense: what, how much, when, who was paid, and whether it was for the whole club or one session. */
export default function ExpenseDialog({ open, onOpenChange, ...formProps }: ExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{formProps.editing ? `Edit ${formProps.initial.description}` : 'Add an expense'}</DialogTitle>
          <DialogDescription>It counts against the club's earnings on the day it was spent.</DialogDescription>
        </DialogHeader>
        {open && <ExpenseForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
