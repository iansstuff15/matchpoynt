import type { CurrentUser } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import OAuthButtons from '@/components/auth/OAuthButtons'
import PasswordInput from '@/components/auth/PasswordInput'
import SignInAccount from '@/components/auth/SignInAccount'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePasswordSignIn } from '@/utils/hooks/useAccount'
import { useFeatures } from '@/utils/hooks/useFeatures'

type Step = 'email' | 'password'

interface SignInFormProps {
  /** Page to return to after signing in. The API checks it and answers with where to go. */
  next?: string
  /** Replaces the default navigation, e.g. to stay on the board. */
  onSignedIn?: (user: CurrentUser) => void
}

/**
 * Email or username first, then password, then Google and
 * Apple. Every option follows its own feature toggle.
 */
/** Looks like an email (an "@" after the first character), as opposed to a username. Only for prefilling; the API decides. */
const isEmail = (value: string) => value.trim().slice(1).includes('@')

export default function SignInForm({ next, onSignedIn }: SignInFormProps) {
  const { web } = useFeatures()
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const [step, setStep] = useState<Step>('email')
  // Prefilled from the address, e.g. coming back from changing or restoring the sign-in email.
  const [params] = useSearchParams()
  const [email, setEmail] = useState(() => params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const signIn = usePasswordSignIn()

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

  if (!web.signInEmail) return <OAuthButtons next={next} />

  return (
    <div className="grid gap-5">
      {step === 'email' && (
        <form onSubmit={submitEmail} className="grid gap-4" aria-label="Sign in with your email or username">
          <div className="grid gap-1.5">
            <Label htmlFor={emailId}>Email or username</Label>
            <Input
              id={emailId}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="you@example.com or @username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            <SignInAccount email={email} />
            <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0" onClick={() => setStep('email')}>
              <ArrowLeft />
              Change
            </Button>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={passwordId}>Password</Label>
              {web.passwordReset && (
                <Link to={isEmail(email) ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'} className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput id={passwordId} autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {signIn.isError && <ErrorBanner error={signIn.error} action="sign you in" />}
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="rounded-full px-6" disabled={signIn.isPending}>
              {signIn.isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
              Sign in
            </Button>
          </div>
        </form>
      )}

      <OAuthButtons next={next} />
    </div>
  )
}
