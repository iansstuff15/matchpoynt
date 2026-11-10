import { Link } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import SignUpForm from '@/components/auth/signup/SignUpForm'
import PageMeta from '@/components/seo/PageMeta'
import { authPhotos } from '@/config/authPhotos'
import { emptyProfileDraft } from '@/utils/forms/profileDraft'

export default function SignUpPage() {
  return (
    <AuthLayout photo={authPhotos.signUp}>
      <PageMeta title="Create an account" description="Create a Matchpoynt account to run sessions or join them, across every sport you play." />
      <AuthCard
        title="Create an account"
        description={
          <>
            Already have one?{' '}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <SignUpForm mode="sign-up" initialProfile={emptyProfileDraft()} />
      </AuthCard>
    </AuthLayout>
  )
}
