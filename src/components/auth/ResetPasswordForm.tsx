import { accountLimits } from '@matchpoynt/shared'
import { ArrowRight, Check, KeyRound, LoaderCircle } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import PasswordInput from '@/components/auth/PasswordInput'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useResetPassword, useSetPassword } from '@/utils/hooks/useAccount'

interface ResetPasswordFormProps {
  /** `reset`: arrived from a reset email. `set`: already signed in (account menu). */
  mode?: 'reset' | 'set'
}

/** Sets a new password, either from a reset email (which signs the browser in for this change) or while signed in. */
export default function ResetPasswordForm({ mode = 'reset' }: ResetPasswordFormProps) {
  const ids = { password: useId(), confirm: useId() }
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const resetMutation = useResetPassword()
  const setMutation = useSetPassword()
  const reset = mode === 'set' ? setMutation : resetMutation
  const mismatch = confirm.length > 0 && confirm !== password

  const submit = (event: FormEvent) => {
    event.preventDefault()
    reset.mutate({ password })
  }

  if (reset.isSuccess) {
    return (
      <div role="status" className="grid gap-3 rounded-lg bg-primary/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Check className="size-4" aria-hidden />
          {mode === 'set' ? 'Your password is set' : 'Your password is changed'}
        </p>
        <Button className="w-fit rounded-full" asChild>
          <Link to="/app">
            Go to the session board
            <ArrowRight />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-label="Choose a new password">
      <div className="grid gap-1.5">
        <Label htmlFor={ids.password}>New password</Label>
        <PasswordInput id={ids.password} autoComplete="new-password" required autoFocus minLength={accountLimits.passwordMinLength} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">At least {accountLimits.passwordMinLength} characters, with a letter and a number.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.confirm}>Confirm new password</Label>
        <PasswordInput
          id={ids.confirm}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            e.target.setCustomValidity(e.target.value && e.target.value !== password ? 'The passwords do not match.' : '')
          }}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-destructive">The passwords do not match.</p>}
      </div>
      {reset.isError && <ErrorBanner error={reset.error} action={mode === 'set' ? 'set your password' : 'change your password'} />}
      <Button type="submit" size="lg" className="ml-auto rounded-full px-6" disabled={reset.isPending}>
        {reset.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
        {mode === 'set' ? 'Set password' : 'Change password'}
      </Button>
    </form>
  )
}
