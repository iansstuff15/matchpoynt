import { KeyRound, LogIn, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { authPhotos } from '@/config/authPhotos'
import { useFeatures } from '@/utils/hooks/useFeatures'

/**
 * Where "Undo this change" (in the email-change email) lands: the old sign-in
 * email is back. Someone else may have made the change, so the next step
 * offered is a new password.
 */
export default function EmailRestoredPage() {
  const [params] = useSearchParams()
  const email = params.get('email')
  const { web } = useFeatures()
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Email change undone" description="Your Matchpoynt sign-in email is back to what it was." />
      <AuthCard title="Change undone" description={email ? `You sign in with ${email} again.` : 'Your sign-in email is back to what it was.'}>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden />
          If you didn't make that change, someone may know your password. Choose a new one now to keep your account safe.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to={email ? `/sign-in?email=${encodeURIComponent(email)}` : '/sign-in'}>
              <LogIn />
              Sign in
            </Link>
          </Button>
          {web.passwordReset && (
            <Button asChild className="rounded-full">
              <Link to={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}>
                <KeyRound />
                Choose a new password
              </Link>
            </Button>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
