import { accountLimits } from '@matchpoynt/shared'
import { useId } from 'react'
import PasswordInput from '@/components/auth/PasswordInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AccountStepProps {
  email: string
  password: string
  confirm: string
  onChange: (patch: Partial<{ email: string; password: string; confirm: string }>) => void
  /** The email is fixed (an invite was sent to it); only the password is chosen here. */
  emailLocked?: boolean
}

export default function AccountStep({ email, password, confirm, onChange, emailLocked = false }: AccountStepProps) {
  const ids = { email: useId(), password: useId(), confirm: useId() }
  const mismatch = confirm.length > 0 && confirm !== password
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={ids.email}>Email address</Label>
        <Input
          id={ids.email}
          type="email"
          autoComplete="email"
          required
          readOnly={emailLocked}
          value={email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.password}>Password</Label>
        <PasswordInput
          id={ids.password}
          autoComplete="new-password"
          required
          minLength={accountLimits.passwordMinLength}
          value={password}
          onChange={(e) => onChange({ password: e.target.value })}
          aria-describedby={`${ids.password}-hint`}
        />
        <p id={`${ids.password}-hint`} className="text-xs text-muted-foreground">
          At least {accountLimits.passwordMinLength} characters, with a letter and a number.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.confirm}>Confirm password</Label>
        <PasswordInput
          id={ids.confirm}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => {
            onChange({ confirm: e.target.value })
            e.target.setCustomValidity(e.target.value && e.target.value !== password ? 'The passwords do not match.' : '')
          }}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-destructive">The passwords do not match.</p>}
      </div>
    </div>
  )
}
