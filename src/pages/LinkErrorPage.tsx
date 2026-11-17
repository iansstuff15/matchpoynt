import { ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { homePath } from '@/utils/platform'
import AuthCard from '@/components/auth/AuthCard'
import AuthLayout from '@/components/auth/AuthLayout'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { authLinkFallback, authLinkHelp, authLinkKinds, inviteLinkTip, type AuthLinkKind } from '@/config/authLinks'
import { authPhotos } from '@/config/authPhotos'

/**
 * Where an emailed link that didn't work lands (`/auth/link-error?reason=&mode=`):
 * what happened, in plain words, and the one thing to do instead for that kind of link.
 */
export default function LinkErrorPage() {
  const [params] = useSearchParams()
  const expired = params.get('reason') === 'expired'
  const kind = authLinkKinds.find((k) => k === params.get('mode')) as AuthLinkKind | undefined
  const help = kind ? authLinkHelp[kind] : null
  const action = help?.action ?? authLinkFallback
  const Icon = action.icon
  return (
    <AuthLayout photo={authPhotos.recovery}>
      <PageMeta title="Link not working" description="This Matchpoynt email link has expired, was already used, or isn't complete." />
      <AuthCard
        title={expired ? 'This link has expired' : "This link isn't working"}
        description={
          expired
            ? `Each link works once, for a limited time${help ? `, and this one to ${help.what} has run out or was already used` : ''}.`
            : `The link${help ? ` to ${help.what}` : ''} isn't complete, or isn't a Matchpoynt link. Try opening it from the email again, or start over.`
        }
      >
        {kind === 'signIn' && <p className="text-sm text-muted-foreground">{inviteLinkTip}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to={homePath()}>
              <ArrowLeft />
              Home
            </Link>
          </Button>
          <Button asChild size="lg" className="rounded-full px-6">
            <Link to={action.href}>
              <Icon />
              {action.label}
            </Link>
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
