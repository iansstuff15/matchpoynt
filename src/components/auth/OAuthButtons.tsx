import AuthDivider from '@/components/auth/AuthDivider'
import OAuthButton from '@/components/auth/OAuthButton'
import { useFeatures } from '@/utils/hooks/useFeatures'

/** Google and Apple sign-in, each shown only while its toggle is on. `next` is the page to return to. */
export default function OAuthButtons({ next }: { next?: string }) {
  const { web } = useFeatures()
  if (!web.signInGoogle && !web.signInApple) return null
  return (
    <>
      <AuthDivider />
      <div className="grid gap-3">
        {web.signInGoogle && <OAuthButton provider="google" label="Google" next={next} />}
        {web.signInApple && <OAuthButton provider="apple" label="Apple" next={next} />}
      </div>
    </>
  )
}
