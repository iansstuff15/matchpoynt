import { Navigate } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import AuthLayout from '@/components/auth/AuthLayout'
import SignUpForm from '@/components/auth/signup/SignUpForm'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'
import { profileDraftFrom } from '@/utils/forms/profileDraft'
import { useProfile } from '@/utils/hooks/useAccount'
import { useMe } from '@/utils/hooks/useMe'

/** The sign-up form without the account step, for signed-in people whose profile is missing details. */
export default function CompleteProfilePage() {
  const me = useMe()
  const signedIn = Boolean(me.data?.user)
  const status = useProfile(signedIn)

  if (me.isSuccess && !signedIn) return <Navigate to="/sign-in" replace />
  // Same source as RequireCompleteProfile, so the two can never disagree and redirect in a loop.
  if (me.data?.user?.profileComplete) return <Navigate to="/app" replace />

  return (
    <AuthLayout photo={authPhotos.signUp}>
      <PageMeta title="Complete your profile" description="Add the details Matchpoynt needs before you run or join a session." />
      {status.isError ? (
        <ErrorBanner error={status.error} action="load your profile" onRetry={() => void status.refetch()} />
      ) : !status.data ? (
        <AuthCardSkeleton />
      ) : (
        <AuthCard title="Complete your profile" description="A few details before you get on court. You only do this once.">
          <SignUpForm mode="complete" initialProfile={profileDraftFrom(status.data)} />
        </AuthCard>
      )}
    </AuthLayout>
  )
}
