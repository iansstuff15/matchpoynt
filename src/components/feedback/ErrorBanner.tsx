import { CircleAlert, RotateCcw, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { describeError } from '@/utils/feedback/describeError'

interface ErrorBannerProps {
  error: unknown
  /** Completes "Couldn't …", e.g. "save the result on Court 2". */
  action: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/** Says simply what failed and why, with a retry. Errors are shown here, never as toasts. */
export default function ErrorBanner({ error, action, onRetry, onDismiss, className }: ErrorBannerProps) {
  const report = describeError(error, action)

  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert />
      <AlertTitle>{report.title}</AlertTitle>
      <AlertDescription className="grid gap-2">
        <p>{report.message}</p>
        {(onRetry || onDismiss) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCcw />
                Try again
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <X />
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
