import type { PaymentMethod } from '@matchpoynt/shared'
import { Banknote, Smartphone } from 'lucide-react'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { paymentMethods } from '@/config/fees'

const icons = { cash: Banknote, online: Smartphone } as const

interface PaymentMethodPickerProps {
  label: string
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

/** Cash or online: how a payment was made. */
export default function PaymentMethodPicker({ label, value, onChange }: PaymentMethodPickerProps) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <Label id={id}>{label}</Label>
      <RadioGroup aria-labelledby={id} value={value} onValueChange={(v) => onChange(v as PaymentMethod)} className="flex flex-wrap gap-4">
        {(Object.keys(paymentMethods) as PaymentMethod[]).map((method) => {
          const Icon = icons[method]
          return (
            <Label key={method} className="flex cursor-pointer items-center gap-2 font-normal">
              <RadioGroupItem value={method} />
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {paymentMethods[method]}
            </Label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
