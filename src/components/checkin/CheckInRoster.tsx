import type { CheckInRosterView } from '@matchpoynt/shared'
import { Check, LoaderCircle, Search, UserCheck } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'

interface CheckInRosterProps {
  players: CheckInRosterView['players']
  pending: boolean
  error: unknown
  onCheckIn: (playerId: string) => void
}

/** Pick your name from the session's list, then check in. Names already checked in can't be picked. */
export default function CheckInRoster({ players, pending, error, onCheckIn }: CheckInRosterProps) {
  const searchId = useId()
  const [search, setSearch] = useState('')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const chosen = players.find((p) => p.id === chosenId && !p.checkedIn) ?? null
  const term = search.trim().toLowerCase()
  const shown = term ? players.filter((p) => p.name.toLowerCase().includes(term)) : players

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Find your name</CardTitle>
        <CardDescription>Tap your name, then check in. You'll join the queue for the next open court.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={searchId} className="sr-only">
            Search names
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id={searchId} type="search" placeholder="Search names" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="h-72 rounded-md border">
          {shown.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No name matches “{search.trim()}”. Not on the list? Ask the Queue Master to add you.</p>
          ) : (
            <ul aria-label="Players in this session" className="divide-y">
              {shown.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={p.checkedIn}
                    aria-pressed={chosen?.id === p.id}
                    onClick={() => setChosenId(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors outline-none focus-visible:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground',
                      chosen?.id === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    <span className="min-w-0 truncate" title={p.name}>
                      {p.name}
                    </span>
                    {p.checkedIn ? (
                      <Badge variant="secondary" className="ml-auto">
                        <Check aria-hidden />
                        Checked in
                      </Badge>
                    ) : (
                      chosen?.id === p.id && <Check className="ml-auto size-4" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        {Boolean(error) && <ErrorBanner error={error} action={`check ${chosen?.name ?? 'you'} in`} onRetry={chosen ? () => onCheckIn(chosen.id) : undefined} />}
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" disabled={!chosen || pending} onClick={() => chosen && onCheckIn(chosen.id)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <UserCheck />}
          <span className="min-w-0 truncate">{chosen ? `Check in as ${chosen.name}` : 'Choose your name'}</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
