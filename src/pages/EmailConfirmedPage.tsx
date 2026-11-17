import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { authPhotos } from '@/config/authPhotos'
import { useMe } from '@/utils/hooks/useMe'

/** Where the link in "Confirm your email" lands once it's worked: on to sign in (or onward, if already signed in). */
export default function EmailConfirmedPage() {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/app'
  const me = useMe()
  const signedIn = Boolean(me.data?.user)
  return (
    <AuthLayout photo={authPhotos.signUp}>
      <PageMeta title="Email confirmed" description="Your email is confirmed. Sign in to Matchpoynt to start playing." />
      <AuthCard title="Email confirmed" description="Thanks! Your account is ready: sign in to join clubs and follow your sessions.">
        <p className="flex items-center gap-2 text-sm font-medium text-success-foreground">
          <CircleCheck className="size-4" aria-hidden />
          You can sign in with this email now.
        </p>
        <Button asChild size="lg" className="justify-self-end rounded-full px-6">
          <Link to={signedIn ? next : `/sign-in?confirmed=1&next=${encodeURIComponent(next)}`}>
            <ArrowRight />
            {signedIn ? 'Continue' : 'Sign in'}
          </Link>
        </Button>
      </AuthCard>
    </AuthLayout>
  )
}
