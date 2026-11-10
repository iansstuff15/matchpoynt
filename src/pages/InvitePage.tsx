import { LayoutGrid, LoaderCircle, LogOut, UserCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import AuthLayout from '@/components/auth/AuthLayout'
import SignUpForm from '@/components/auth/signup/SignUpForm'
import ClubAvatar from '@/components/club/ClubAvatar'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { authPhotos } from '@/config/authPhotos'
import { profileDraftFrom } from '@/utils/forms/profileDraft'
import { useProfile } from '@/utils/hooks/useAccount'
import { useAcceptInvite, useInvite } from '@/utils/hooks/useInvites'
import { useSignOut } from '@/utils/hooks/useMe'

/**
 * Where a club invite's email link lands (signed in by the link). A new
 * account fills in the sign-up form and chooses its own password; an existing
 * one just joins. Either way the API links the account to the club member.
 */
export default function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const invite = useInvite(token)
  const profile = useProfile(Boolean(invite.data?.needsSignUp))
  const accept = useAcceptInvite(token)
  const signOut = useSignOut()
  const data = invite.data

  let content
  if (invite.isPending || (data?.needsSignUp && data.forYou && profile.isPending)) {
    content = <AuthCardSkeleton />
  } else if (invite.isError) {
    content = <ErrorBanner error={invite.error} action="open this invite" onRetry={() => void invite.refetch()} />
  } else if (data!.acceptedByYou) {
    content = (
      <AuthCard title={`You're in ${data!.clubName}`} description={`Your account is linked to ${data!.memberName} on the club's roster.`}>
        <Button asChild>
          <Link to="/app">
            <LayoutGrid />
            Go to Matchpoynt
          </Link>
        </Button>
      </AuthCard>
    )
  } else if (data!.status !== 'pending') {
    content = (
      <AuthCard title="This invite can't be used" description="It was cancelled, or another account accepted it. Ask the club for a new one.">
        <Button asChild variant="outline">
          <Link to="/app">
            <LayoutGrid />
            Go to Matchpoynt
          </Link>
        </Button>
      </AuthCard>
    )
  } else if (!data!.forYou) {
    content = (
      <AuthCard
        title="Wrong account"
        description={`This invite was sent to ${data!.email}, but you're signed in as ${data!.signedInAs ?? 'someone else'}. Sign out, then open the link from that inbox.`}
      >
        <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate('/sign-in') })}>
          {signOut.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
          Sign out
        </Button>
      </AuthCard>
    )
  } else if (data!.needsSignUp) {
    content = profile.isError ? (
      <ErrorBanner error={profile.error} action="load your profile" onRetry={() => void profile.refetch()} />
    ) : (
      <AuthCard title={`Join ${data!.clubName}`} description="Set your password and tell us a little about you. You only do this once.">
        <div className="mb-4 flex items-center gap-3">
          <ClubAvatar name={data!.clubName} url={data!.clubAvatarUrl} className="size-10" />
          <p className="text-sm text-muted-foreground">
            Invited as <span className="font-medium text-foreground">{data!.memberName}</span>
          </p>
        </div>
        <SignUpForm mode="invite" invite={{ token, email: data!.email }} initialProfile={profileDraftFrom(profile.data!)} />
      </AuthCard>
    )
  } else {
    content = (
      <AuthCard title={`Join ${data!.clubName}`} description={`You'll be linked to ${data!.memberName} on the club's roster.`}>
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <ClubAvatar name={data!.clubName} url={data!.clubAvatarUrl} className="size-12" />
            <p className="font-display text-lg font-semibold">{data!.clubName}</p>
          </div>
          {accept.isError && <ErrorBanner error={accept.error} action="join the club" onRetry={() => accept.mutate({ password: null, profile: null })} />}
          <Button
            disabled={accept.isPending}
            onClick={() => accept.mutate({ password: null, profile: null }, { onSuccess: (res) => navigate(res.redirectTo) })}
          >
            {accept.isPending ? <LoaderCircle className="animate-spin" /> : <UserCheck />}
            Join club
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthLayout photo={authPhotos.signUp}>
      <PageMeta title={data ? `Join ${data.clubName}` : 'Club invite'} description="Accept a club's invite and set up your Matchpoynt account." />
      {content}
    </AuthLayout>
  )
}
