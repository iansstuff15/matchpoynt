import { useSearchParams } from 'react-router'
import AuthLayout from '@/components/auth/AuthLayout'
import SignInCard from '@/components/auth/SignInCard'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'

const errors: Record<string, string> = {
  provider:
    'The sign-in provider refused to start. It is usually turned off or missing its client ID or secret in Firebase (Authentication > Sign-in method). Try another method meanwhile.',
  cancelled: 'Sign-in was cancelled before it finished. Try again, or use another method.',
  linked:
    'That email already has an account that signs in another way. Sign in with your email and password first; the provider can be used after that.',
  missing_code: 'The link arrived without its one-time code, so it may have been cut off. Sign in with your password, or ask the club to send the invite again.',
  unconfirmed: "That account's email isn't confirmed yet. Sign in with your email and password to get a new confirmation link.",
  exchange: 'The link has expired or was already used. Each link works once, for a limited time. Sign in with your password, or ask the club to send the invite again.',
}

export default function SignInPage() {
  const [params] = useSearchParams()
  const error = params.get('error')
  // Where they were when the sign-in expired; the API decides if it may return there.
  const next = params.get('next') ?? undefined
  return (
    <AuthLayout photo={authPhotos.signIn}>
      <PageMeta title="Sign in" description="Sign in to Matchpoynt to run court sessions, track results and see your rankings." />
      <SignInCard
        error={error ? (errors[error] ?? `Sign-in failed (${error}). Try again.`) : null}
        expired={params.get('reason') === 'expired'}
        confirmed={params.get('confirmed') === '1'}
        next={next}
      />
    </AuthLayout>
  )
}
