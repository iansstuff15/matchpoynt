import { accountingLimits, feeCurrencies, type ClubMemberView, type CurrencyCode, type InvoiceSplit, type ManualInvoiceInput } from '@matchpoynt/shared'
import { Divide, LoaderCircle, ReceiptText, Users } from 'lucide-react'
import { useId, useState } from 'react'
import PayerPicker from '@/components/accounting/PayerPicker'
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

interface ManualInvoiceDialogProps {
  open: boolean
  initial: ManualInvoiceInput
  members: ClubMemberView[]
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (invoice: ManualInvoiceInput) => void
}

/** Draft state lives here, so it resets each time the dialog opens. */
function InvoiceForm({ initial, members, pending, error, onSubmit, onCancel }: Omit<ManualInvoiceDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [invoice, setInvoice] = useState(initial)
  const ids = { title: useId(), date: useId(), currency: useId(), notes: useId() }
  const set = (patch: Partial<ManualInvoiceInput>) => setInvoice({ ...invoice, ...patch })
  const submit = () => onSubmit(invoice)

  return (
    <form
      className="grid min-h-0 gap-4 overflow-y-auto pr-1"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action="create the invoice" onRetry={pending ? undefined : submit} />}
      <div className="grid gap-2">
        <Label htmlFor={ids.title}>What is it for?</Label>
        <Input id={ids.title} value={invoice.title} maxLength={accountingLimits.invoiceTitleMaxLength} autoComplete="off" placeholder="e.g. Club shirts, tournament entry, annual dues" onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AmountField label="Amount" value={invoice.amount} currency={invoice.currency} onChange={(amount) => set({ amount })} />
        <div className="grid gap-1.5">
          <Label htmlFor={ids.currency}>Currency</Label>
          <Select value={invoice.currency} onValueChange={(currency) => set({ currency: currency as CurrencyCode })}>
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
          <Label htmlFor={ids.date}>Issued on</Label>
          <Input id={ids.date} type="date" value={invoice.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>The amount is</legend>
        </Label>
        <RadioGroup value={invoice.split} onValueChange={(v) => set({ split: v as InvoiceSplit })} className="sm:grid-cols-2">
          <RadioCard value="each" title="What each payer owes" description="Everyone pays the same amount." icon={Users} />
          <RadioCard value="total" title="A total to split" description="Shared evenly between the payers." icon={Divide} />
        </RadioGroup>
      </fieldset>
      <PayerPicker members={members} payers={invoice.payers} onChange={(payers) => set({ payers })} />
      <div className="grid gap-2">
        <Label htmlFor={ids.notes}>Notes (optional)</Label>
        <Textarea id={ids.notes} value={invoice.notes ?? ''} maxLength={accountingLimits.notesMaxLength} rows={2} placeholder="Due date, how to pay…" onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <ReceiptText />}
          Create invoice
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Creates an invoice outside sessions: what it's for, how much, and who pays. Payers are then ticked off as they pay. */
export default function ManualInvoiceDialog({ open, onOpenChange, ...formProps }: ManualInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New invoice</DialogTitle>
          <DialogDescription>For anything outside a session's fee. Each payer gets their own paid tick.</DialogDescription>
        </DialogHeader>
        {open && <InvoiceForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
