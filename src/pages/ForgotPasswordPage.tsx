import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Forgot password" description="Forgot your Matchpoynt password? Get a link by email to choose a new one." />
      <AuthCard title="Forgot your password?" description="Enter your email or username and we'll email you a link to choose a new one.">
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  )
}
