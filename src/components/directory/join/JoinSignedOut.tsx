import { useQueryClient } from '@tanstack/react-query'
import OAuthButtons from '@/components/auth/OAuthButtons'
import SignInForm from '@/components/auth/SignInForm'
import SignUpForm from '@/components/auth/signup/SignUpForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { emptyProfileDraft } from '@/utils/forms/profileDraft'
import { useFeatures } from '@/utils/hooks/useFeatures'

/**
 * Signing in (or up) without leaving the join page: the sign-in form with
 * Google, or the sign-up form. Both come back here: sign-in at once, a new
 * account after confirming its email.
 */
export default function JoinSignedOut({ next }: { next: string }) {
  const { web } = useFeatures()
  const client = useQueryClient()
  // Stay on the join page; it reloads as the signed-in person.
  const stay = () => void client.invalidateQueries({ queryKey: ['directory'] })
  if (!web.signUp) return <SignInForm next={next} onSignedIn={stay} />
  return (
    <Tabs defaultValue="sign-in" className="gap-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">Sign in</TabsTrigger>
        <TabsTrigger value="sign-up">Create account</TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in">
        <SignInForm next={next} onSignedIn={stay} />
      </TabsContent>
      <TabsContent value="sign-up" className="grid gap-5">
        <SignUpForm mode="sign-up" initialProfile={emptyProfileDraft()} next={next} />
        <OAuthButtons next={next} />
      </TabsContent>
    </Tabs>
  )
}
