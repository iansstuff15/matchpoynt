import { LoaderCircle, type LucideIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmButtonProps {
  label: string
  icon: LucideIcon
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  /** Icon-only trigger; `label` becomes its accessible name. */
  iconOnly?: boolean
  /** Why it can't be used right now (from the API); disables the button and shows as its tooltip. */
  blockedReason?: string | null
  variant?: 'destructive' | 'outline' | 'ghost'
  onConfirm: () => void
}

/** A button that asks first (shadcn AlertDialog), for changes that can't be undone. */
export default function ConfirmButton({
  label,
  icon: Icon,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending,
  iconOnly,
  blockedReason = null,
  variant = 'destructive',
  onConfirm,
}: ConfirmButtonProps) {
  const icon = pending ? <LoaderCircle className="animate-spin" /> : <Icon />
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button variant={variant} size="icon-sm" disabled={pending || blockedReason !== null} aria-label={label} title={blockedReason ?? label}>
            {icon}
          </Button>
        ) : (
          <Button variant={variant} disabled={pending || blockedReason !== null} title={blockedReason ?? undefined}>
            {icon}
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            <Icon />
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
