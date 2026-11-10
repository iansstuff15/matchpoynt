import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Forgot password" description="Get a link to reset your Matchpoynt password." />
      <AuthCard title="Forgot password" description="Enter your account email and we'll send a link to choose a new password.">
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  )
}
