import type { CurrentUser } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, MailCheck } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import OAuthButtons from '@/components/auth/OAuthButtons'
import PasswordInput from '@/components/auth/PasswordInput'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notifyDone } from '@/utils/feedback/notify'
import { usePasswordSignIn } from '@/utils/hooks/useAccount'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useEmailSignIn } from '@/utils/hooks/useMe'

type Step = 'email' | 'password' | 'link-sent'

interface SignInFormProps {
  /** Page to return to after signing in. The API checks it and answers with where to go. */
  next?: string
  /** Replaces the default navigation, e.g. to stay on the board. */
  onSignedIn?: (user: CurrentUser) => void
}

/**
 * Email first, then password (or a one-time sign-in link), then Google and
 * Apple. Every option follows its own feature toggle.
 */
export default function SignInForm({ next, onSignedIn }: SignInFormProps) {
  const { web } = useFeatures()
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = usePasswordSignIn()
  const magicLink = useEmailSignIn()

  const finish = (user: CurrentUser | null, redirectTo: string) => {
    if (!user) return
    if (onSignedIn) return onSignedIn(user)
    navigate(redirectTo)
  }

  const submitEmail = (event: FormEvent) => {
    event.preventDefault()
    setStep('password')
  }
  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    signIn.mutate({ email, password, next }, { onSuccess: (me) => finish(me.user, me.redirectTo) })
  }
  const sendLink = () =>
    magicLink.mutate({ email, next }, {
      onSuccess: () => {
        notifyDone('Sign-in link sent', { description: `Check ${email}.` })
        setStep('link-sent')
      },
    })

  if (!web.signInEmail) return <OAuthButtons next={next} />

  return (
    <div className="grid gap-5">
      {step === 'email' && (
        <form onSubmit={submitEmail} className="grid gap-4" aria-label="Sign in with email">
          <div className="grid gap-1.5">
            <Label htmlFor={emailId}>Email address</Label>
            <Input id={emailId} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="ml-auto rounded-full px-6">
            Continue
            <ArrowRight />
          </Button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={submitPassword} className="grid gap-4" aria-label="Enter your password">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="truncate font-medium">{email}</span>
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setStep('email')}>
              <ArrowLeft />
              Change
            </Button>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={passwordId}>Password</Label>
              {web.passwordReset && (
                <Link to={`/forgot-password?email=${encodeURIComponent(email)}`} className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput id={passwordId} autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {signIn.isError && <ErrorBanner error={signIn.error} action="sign you in" />}
          {magicLink.isError && <ErrorBanner error={magicLink.error} action="send the sign-in link" />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="link" className="h-auto p-0" onClick={sendLink} disabled={magicLink.isPending}>
              {magicLink.isPending ? <LoaderCircle className="animate-spin" /> : <Mail />}
              Email me a sign-in link instead
            </Button>
            <Button type="submit" size="lg" className="rounded-full px-6" disabled={signIn.isPending}>
              {signIn.isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
              Sign in
            </Button>
          </div>
        </form>
      )}

      {step === 'link-sent' && (
        <div role="status" className="grid gap-3 rounded-lg bg-primary/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <MailCheck className="size-4" aria-hidden />
            Check {email}
          </p>
          <p>We sent a one-time sign-in link. It works once and expires soon.</p>
          <Button type="button" variant="link" className="h-auto justify-start p-0" onClick={() => setStep('email')}>
            <ArrowLeft />
            Use a different email
          </Button>
        </div>
      )}

      <OAuthButtons next={next} />
    </div>
  )
}
