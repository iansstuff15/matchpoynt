import { ArrowLeft, LoaderCircle, MailCheck, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import AuthLayout from '@/components/auth/AuthLayout'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authPhotos } from '@/config/authPhotos'
import { useChangeEmail } from '@/utils/hooks/useAccount'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Change the sign-in email of the signed-in account (`/account/email`). A
 * link goes to the new address, and the change happens once it's opened
 * (then `/auth/email-changed`); the old address gets a link to undo it.
 */
export default function ChangeEmailPage() {
  const me = useMe()
  const fieldId = useId()
  const [email, setEmail] = useState('')
  const change = useChangeEmail()
  if (me.isSuccess && !me.data.user) return <Navigate to="/sign-in?next=%2Faccount%2Femail" replace />
  const send = () => change.mutate({ email: email.trim() })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    send()
  }

  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Change your email" description="Change the email you sign in to Matchpoynt with." />
      {me.isPending ? (
        <AuthCardSkeleton />
      ) : (
        <AuthCard title="Change your email" description={`You sign in with ${me.data?.user?.email ?? 'your current email'}. We'll send a link to the new one to make sure it's yours.`}>
          {change.isSuccess ? (
            <div role="status" className="grid gap-3 rounded-xl bg-primary/10 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <MailCheck className="size-4" aria-hidden />
                Check {change.variables?.email}
              </p>
              <p>Open the link we sent there to switch to it. Until then you keep signing in with your current email, and that inbox gets a link to undo the change if it wasn't you.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4" aria-label="Change your sign-in email">
              <div className="grid gap-1.5">
                <Label htmlFor={fieldId}>New email</Label>
                <Input id={fieldId} type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {change.isError && <ErrorBanner error={change.error} action="send the link to your new email" onRetry={send} />}
              <Button type="submit" size="lg" className="justify-self-end rounded-full px-6" disabled={change.isPending}>
                {change.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
                Send the link
              </Button>
            </form>
          )}
          <Button variant="link" className="h-auto justify-self-start p-0" asChild>
            <Link to="/profile">
              <ArrowLeft />
              Back to your profile
            </Link>
          </Button>
        </AuthCard>
      )}
    </AuthLayout>
  )
}
