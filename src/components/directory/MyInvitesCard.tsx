import type { MyClubInviteView } from '@matchpoynt/shared'
import { Check, MailOpen, X } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { useJoining } from '@/utils/hooks/useDirectory'

/** Clubs that invited the viewer in the app: join (linking their account to the roster) or decline. */
export default function MyInvitesCard({ invites, joining }: { invites: MyClubInviteView[]; joining: ReturnType<typeof useJoining> }) {
  const { answerInvite } = joining
  const busy = (id: string) => answerInvite.isPending && answerInvite.variables?.id === id
  return (
    <Card aria-labelledby="my-invites-title">
      <CardHeader>
        <CardTitle id="my-invites-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <MailOpen className="size-5" aria-hidden />
          Invites · {invites.length}
        </CardTitle>
        <CardDescription>Clubs that added you to their roster. Accept to link it to your account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Boolean(answerInvite.error) && answerInvite.variables && (
          <ErrorBanner error={answerInvite.error} action={`answer ${answerInvite.variables.name}'s invite`} onRetry={() => answerInvite.variables && answerInvite.mutate(answerInvite.variables)} />
        )}
        <ul className="grid gap-2" aria-label="Club invites">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <ClubAvatar name={i.club.name} url={i.club.avatarUrl} position={i.club.avatarPosition} className="size-10" />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{i.club.name}</span>
                {i.club.handle && <span className="truncate text-xs text-muted-foreground">@{i.club.handle}</span>}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy(i.id)} onClick={() => answerInvite.mutate({ id: i.id, name: i.club.name, accept: false })}>
                  <X />
                  Decline
                </Button>
                <Button size="sm" disabled={busy(i.id)} onClick={() => answerInvite.mutate({ id: i.id, name: i.club.name, accept: true })} aria-label={`Join ${i.club.name}`}>
                  <Check />
                  Join
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
