import { ArrowLeft, LoaderCircle, MailCheck, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPassword } from '@/utils/hooks/useAccount'

/** Asks for the account email and sends a reset link. */
export default function ForgotPasswordForm() {
  const [params] = useSearchParams()
  const emailId = useId()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const forgot = useForgotPassword()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    forgot.mutate({ email })
  }

  if (forgot.isSuccess) {
    return (
      <div role="status" className="grid gap-3 rounded-lg bg-primary/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <MailCheck className="size-4" aria-hidden />
          Check {email}
        </p>
        <p>If it belongs to a Matchpoynt account, a reset link is on its way. Open it on this device; it works once.</p>
        <Button variant="link" className="h-auto justify-start p-0" asChild>
          <Link to="/sign-in">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-label="Request a password reset link">
      <div className="grid gap-1.5">
        <Label htmlFor={emailId}>Email address</Label>
        <Input id={emailId} type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {forgot.isError && <ErrorBanner error={forgot.error} action="send the reset link" onRetry={() => forgot.mutate({ email })} />}
      <div className="flex items-center justify-between gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link to="/sign-in">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
        <Button type="submit" size="lg" className="rounded-full px-6" disabled={forgot.isPending}>
          {forgot.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
          Send reset link
        </Button>
      </div>
    </form>
  )
}
