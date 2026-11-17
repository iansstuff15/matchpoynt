import ClubAvatar from '@/components/club/ClubAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccountLookup } from '@/utils/hooks/useMe'

/**
 * The account an email or username belongs to, on the sign-in form's password step: its
 * photo, name and @username when it has them, otherwise just the email.
 */
export default function SignInAccount({ email }: { email: string }) {
  const lookup = useAccountLookup(email, true)
  if (lookup.isPending) {
    return (
      <span className="flex min-w-0 items-center gap-3" aria-busy="true" aria-label="Looking up the account">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <span className="grid gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </span>
      </span>
    )
  }
  const account = lookup.data
  const typed = email.trim()
  // What they typed, unless it's the username already shown.
  const emailShown = typed.slice(1).includes('@') ? typed : null
  const name = account?.displayName ?? typed
  return (
    <span className="flex min-w-0 items-center gap-3" aria-label={`Signing in as ${account?.username ? `@${account.username}` : typed}`}>
      {account && <ClubAvatar name={name} url={account.avatarUrl} position={account.avatarPosition} className="size-10" />}
      <span className="grid min-w-0">
        <span className="truncate font-medium">{account?.displayName ?? typed}</span>
        {account?.username ? (
          <span className="truncate text-xs text-muted-foreground">{[`@${account.username}`, emailShown].filter(Boolean).join(' · ')}</span>
        ) : (
          account?.displayName && <span className="truncate text-xs text-muted-foreground">{typed}</span>
        )}
      </span>
    </span>
  )
}
