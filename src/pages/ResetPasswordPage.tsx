import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'

export default function ResetPasswordPage() {
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Choose a new password" description="Set a new password for your Matchpoynt account." />
      <AuthCard title="Choose a new password" description="You'll use it the next time you sign in.">
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  )
}
