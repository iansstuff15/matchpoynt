import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/utils/cn'

interface RadioCardProps {
  value: string
  title: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
}

/** A selectable card inside a shadcn `RadioGroup`. */
export default function RadioCard({ value, title, description, icon: Icon, disabled }: RadioCardProps) {
  const id = useId()
  return (
    <Label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors hover:bg-muted/50',
        'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <RadioGroupItem id={id} value={value} disabled={disabled} className="mt-0.5" />
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
      <span className="grid gap-1">
        <span className="font-medium">{title}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </span>
    </Label>
  )
}
