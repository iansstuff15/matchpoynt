import type { CurrentUser } from '@matchpoynt/shared'
import { CircleAlert, Clock, MailCheck } from 'lucide-react'
import StatusBanner from '@/components/feedback/StatusBanner'
import { Link } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import SignInForm from '@/components/auth/SignInForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface SignInCardProps {
  title?: string
  error?: string | null
  /** The previous sign-in expired; they'll be taken back to where they were. */
  expired?: boolean
  /** They just confirmed their email from the link we sent. */
  confirmed?: boolean
  next?: string
  onSignedIn?: (user: CurrentUser) => void
}

/** Sign-in card used on the sign-in page, the landing page and the board. */
export default function SignInCard({ title = 'Sign in', error, expired, confirmed, next, onSignedIn }: SignInCardProps) {
  const { web } = useFeatures()
  const methods = web.signInEmail || web.signInGoogle || web.signInApple

  return (
    <AuthCard
      title={title}
      description={
        web.signUp ? (
          <>
            New to Matchpoynt?{' '}
            <Link to="/sign-up" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : undefined
      }
    >
      {expired && (
        <StatusBanner variant="info" icon={Clock} title="Your sign-in expired">
          Sign in again and you'll go straight back to where you were.
        </StatusBanner>
      )}
      {confirmed && (
        <StatusBanner variant="success" icon={MailCheck} title="Email confirmed">
          Your account is ready. Sign in with your email and password.
        </StatusBanner>
      )}
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Sign-in didn't finish</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {methods ? <SignInForm next={next} onSignedIn={onSignedIn} /> : <p className="text-sm text-muted-foreground">No sign-in methods are switched on right now.</p>}
    </AuthCard>
  )
}
