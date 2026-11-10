import { Navigate } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import AuthLayout from '@/components/auth/AuthLayout'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'
import { useMe } from '@/utils/hooks/useMe'

/** Set or change the password of the signed-in account, e.g. one that has only used email links, Google or Apple. */
export default function SetPasswordPage() {
  const me = useMe()
  if (me.isSuccess && !me.data.user) return <Navigate to="/sign-in" replace />

  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Set a password" description="Set a password so you can sign in to Matchpoynt with your email." />
      {me.isPending ? (
        <AuthCardSkeleton />
      ) : (
        <AuthCard
          title="Set a password"
          description={`For ${me.data?.user?.email ?? 'your account'}. You can still use email links, Google or Apple too.`}
        >
          <ResetPasswordForm mode="set" />
        </AuthCard>
      )}
    </AuthLayout>
  )
}
