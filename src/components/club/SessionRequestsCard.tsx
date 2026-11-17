import type { SessionRequestView } from '@matchpoynt/shared'
import { CalendarCheck, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { useClubActions } from '@/utils/hooks/useClubs'
import { formatWhen } from '@/utils/time/formatWhen'

/**
 * Members asking to join one of the club's sessions. Approving adds them to a
 * planned session's roster, or to a running board (to check in at the venue).
 */
export default function SessionRequestsCard({ requests, actions }: { requests: SessionRequestView[]; actions: ReturnType<typeof useClubActions> }) {
  const { decideSessionRequest } = actions
  const busy = (id: string) => decideSessionRequest.isPending && decideSessionRequest.variables?.id === id
  const decide = (r: SessionRequestView, approve: boolean) => decideSessionRequest.mutate({ id: r.id, name: r.memberName, session: r.sessionLabel, approve })
  return (
    <Card aria-labelledby="session-requests-title">
      <CardHeader>
        <CardTitle id="session-requests-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <CalendarCheck className="size-5" aria-hidden />
          Asking to play · {requests.length}
        </CardTitle>
        <CardDescription>Members who asked to join a session from the club's page.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Requests to join sessions">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">
                  {r.memberName} → {r.sessionLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.sessionId ? 'Running now' : 'Planned'} · asked {formatWhen(r.requestedAt)}
                </span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy(r.id)} onClick={() => decide(r, false)}>
                  <X />
                  Decline
                </Button>
                <Button size="sm" disabled={busy(r.id)} onClick={() => decide(r, true)} aria-label={`Add ${r.memberName} to ${r.sessionLabel}`}>
                  <Check />
                  Add
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
