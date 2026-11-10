import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface StatusBannerProps {
  variant: 'info' | 'warning' | 'success'
  icon: LucideIcon
  title: string
  children?: ReactNode
  className?: string
}

/** A persistent state worth knowing about (offline, saving, stale data). Not for errors. */
export default function StatusBanner({ variant, icon: Icon, title, children, className }: StatusBannerProps) {
  return (
    <Alert variant={variant} role="status" aria-live="polite" className={className}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  )
}
