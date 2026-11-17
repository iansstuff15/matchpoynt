import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toAmountText, toMinor } from '@/utils/forms/money'

interface AmountFieldProps {
  label: string
  /** In minor units. */
  value: number
  currency: string
  onChange: (minor: number) => void
}

/** An amount of money, typed as "150" or "150.50" and kept in minor units. */
export default function AmountField({ label, value, currency, onChange }: AmountFieldProps) {
  const id = useId()
  const [text, setText] = useState(() => toAmountText(value))
  // A new amount from outside (a club's fee picked): show it. Typing that means the same amount is left alone.
  const [seen, setSeen] = useState(value)
  // Object.is, since an amount being typed can be NaN.
  if (!Object.is(value, seen)) {
    setSeen(value)
    if (!Object.is(toMinor(text), value)) setText(toAmountText(value))
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <span className="w-10 text-sm text-muted-foreground" aria-hidden>
          {currency}
        </span>
        <Input
          id={id}
          inputMode="decimal"
          placeholder="0.00"
          className="w-36 tabular-nums"
          value={text}
          aria-describedby={`${id}-currency`}
          onChange={(e) => {
            setText(e.target.value)
            onChange(toMinor(e.target.value))
          }}
        />
        <span id={`${id}-currency`} className="sr-only">
          in {currency}
        </span>
      </div>
    </div>
  )
}
