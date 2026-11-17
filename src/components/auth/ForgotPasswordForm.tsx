import { ArrowLeft, Inbox, LoaderCircle, MailCheck, RotateCcw, Send } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passwordReset } from '@/config/passwordReset'
import { useForgotPassword } from '@/utils/hooks/useAccount'

/** Looks like an email (an "@" after the first character), as opposed to a username. Only for wording; the API decides. */
const isEmail = (value: string) => value.trim().slice(1).includes('@')

/** Seconds left before "Send it again", counting down once a link is sent. */
function useCooldown(sentAt: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (sentAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [sentAt])
  if (sentAt === null) return 0
  return Math.max(0, passwordReset.resendCooldownSec - Math.floor((now - sentAt) / 1000))
}

/**
 * Asks for the account's email or username and sends a reset link to the
 * account's email. Then "Check your inbox", with the link sent again on
 * request (after a short wait). The answer is the same whether or not the
 * account exists, so the form can't be used to find accounts.
 */
export default function ForgotPasswordForm() {
  const [params] = useSearchParams()
  const fieldId = useId()
  const [typed, setTyped] = useState(params.get('email') ?? '')
  const [sentAt, setSentAt] = useState<number | null>(null)
  const forgot = useForgotPassword()
  const wait = useCooldown(sentAt)
  const send = () => forgot.mutate({ email: typed.trim() }, { onSuccess: () => setSentAt(Date.now()) })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    send()
  }

  if (sentAt !== null) {
    const who = typed.trim()
    return (
      <div role="status" className="grid gap-4">
        <div className="grid justify-items-center gap-3 rounded-xl bg-primary/10 p-5 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <p className="font-display text-lg font-bold">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            {isEmail(who) ? (
              <>
                If <span className="font-medium text-foreground">{who}</span> belongs to a Matchpoynt account, a link to choose a new password is on its way.
              </>
            ) : (
              <>
                If <span className="font-medium text-foreground">@{who.replace(/^@/, '')}</span> is a Matchpoynt account, a link to choose a new password is on its way to its email.
              </>
            )}
          </p>
        </div>
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Inbox className="mt-0.5 size-4 shrink-0" aria-hidden />
            It can take a minute. Check your spam or promotions folder too.
          </li>
          <li className="flex gap-2">
            <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Open the link on this device. It works once, and only for a while.
          </li>
        </ul>
        {forgot.isError && <ErrorBanner error={forgot.error} action="send the link again" onRetry={send} />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to="/sign-in">
              <ArrowLeft />
              Back to sign in
            </Link>
          </Button>
          <Button type="button" variant="outline" className="rounded-full" disabled={wait > 0 || forgot.isPending} onClick={send}>
            {forgot.isPending ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
            {wait > 0 ? `Send it again in ${wait}s` : 'Send it again'}
          </Button>
        </div>
        <Button type="button" variant="link" className="h-auto justify-self-start p-0 text-sm" onClick={() => setSentAt(null)}>
          Use a different email or username
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-label="Request a password reset link">
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId}>Email or username</Label>
        <Input
          id={fieldId}
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          placeholder="you@example.com or @username"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">The link goes to the email on your account.</p>
      </div>
      {forgot.isError && <ErrorBanner error={forgot.error} action="send the reset link" onRetry={send} />}
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
