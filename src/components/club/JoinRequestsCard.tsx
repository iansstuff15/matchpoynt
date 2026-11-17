import type { JoinRequestView } from '@matchpoynt/shared'
import { Check, UserPlus, X } from 'lucide-react'
import PersonRow from '@/components/common/PersonRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import type { useClubActions } from '@/utils/hooks/useClubs'

/** People asking to join the club, oldest first, to approve (they join the roster, linked to their account) or decline. */
export default function JoinRequestsCard({ requests, actions }: { requests: JoinRequestView[]; actions: ReturnType<typeof useClubActions> }) {
  const { decideJoinRequest } = actions
  const busy = (id: string) => decideJoinRequest.isPending && decideJoinRequest.variables?.id === id
  return (
    <Card aria-labelledby="join-requests-title">
      <CardHeader>
        <CardTitle id="join-requests-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <UserPlus className="size-5" aria-hidden />
          Asking to join · {requests.length}
        </CardTitle>
        <CardDescription>Approve to add them to the roster, linked to their account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Requests to join">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <PersonRow
                name={r.name}
                username={r.username}
                email={null}
                avatarUrl={r.avatarUrl}
                avatarPosition={r.avatarPosition}
                aside={r.tiers.map((t) => `${sports[t.sportId].name} ${sports[t.sportId].tiers.find((x) => x.id === t.tierId)?.label ?? ''}`.trim()).join(' · ')}
              />
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy(r.id)} onClick={() => decideJoinRequest.mutate({ id: r.id, name: r.name, approve: false })}>
                  <X />
                  Decline
                </Button>
                <Button size="sm" disabled={busy(r.id)} onClick={() => decideJoinRequest.mutate({ id: r.id, name: r.name, approve: true })} aria-label={`Approve ${r.name}`}>
                  <Check />
                  Approve
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
