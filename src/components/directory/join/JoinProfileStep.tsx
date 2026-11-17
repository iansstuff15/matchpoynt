import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import SignUpForm from '@/components/auth/signup/SignUpForm'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { profileDraftFrom } from '@/utils/forms/profileDraft'
import { useProfile } from '@/utils/hooks/useAccount'

/** The details a club needs before someone joins (the complete-profile form), filled in on the join page. */
export default function JoinProfileStep({ onDone }: { onDone: () => void }) {
  const status = useProfile()
  if (status.isError) return <ErrorBanner error={status.error} action="load your profile" onRetry={() => void status.refetch()} />
  if (!status.data) return <AuthCardSkeleton />
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Clubs see your name, username and skill tier. Fill these in to join.</p>
      <SignUpForm mode="complete" initialProfile={profileDraftFrom(status.data)} onDone={onDone} />
    </div>
  )
}
