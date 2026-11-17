import { CircleCheck, LogIn } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { authPhotos } from '@/config/authPhotos'

/** Where the link sent to a new sign-in email lands once it's switched: sign in again with it. */
export default function EmailChangedPage() {
  const [params] = useSearchParams()
  const email = params.get('email')
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Email changed" description="Your Matchpoynt sign-in email has changed. Sign in again with your new email." />
      <AuthCard title="Email changed" description={email ? `You now sign in with ${email}.` : 'You now sign in with your new email.'}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success-foreground" aria-hidden />
          For your security you've been signed out. Sign in again with your new email; your password stays the same.
        </p>
        <Button asChild size="lg" className="justify-self-end rounded-full px-6">
          <Link to={email ? `/sign-in?email=${encodeURIComponent(email)}` : '/sign-in'}>
            <LogIn />
            Sign in
          </Link>
        </Button>
      </AuthCard>
    </AuthLayout>
  )
}
