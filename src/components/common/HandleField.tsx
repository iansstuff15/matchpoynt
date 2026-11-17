import { handleRules } from '@matchpoynt/shared'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { useId } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { useNameCheck } from '@/utils/hooks/useNameCheck'

interface HandleFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** The API's answer for what's typed (`useNameCheck`). */
  check: ReturnType<typeof useNameCheck>
  hint?: string
}

/** An "@" name (club handle or username), with the API's live answer on whether it's free. */
export default function HandleField({ label, value, onChange, check, hint }: HandleFieldProps) {
  const id = useId()
  const typed = value.trim().length > 0
  const answer = check.check.data
  const status = !typed ? null : !check.ready ? 'checking' : answer?.available ? 'free' : 'taken'

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2 rounded-md border bg-card pl-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <span className="text-muted-foreground" aria-hidden>
          @
        </span>
        <Input
          id={id}
          value={value}
          maxLength={handleRules.maxLength + 1}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="border-0 pl-0 shadow-none focus-visible:ring-0"
          aria-describedby={`${id}-status`}
          aria-invalid={status === 'taken' || undefined}
          onChange={(e) => onChange(e.target.value.replace(/^@+/, ''))}
        />
      </div>
      <p id={`${id}-status`} role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === 'checking' && (
          <>
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            Checking @{value.trim().toLowerCase()}…
          </>
        )}
        {status === 'free' && (
          <>
            <CircleCheck className="size-3.5 text-success" aria-hidden />@{answer?.value} is available
          </>
        )}
        {status === 'taken' && (
          <>
            <CircleX className="size-3.5 text-destructive" aria-hidden />
            {answer?.reason}
          </>
        )}
        {status === null && hint}
      </p>
      {check.check.isError && <ErrorBanner error={check.check.error} action="check that name" onRetry={() => void check.check.refetch()} />}
    </div>
  )
}
