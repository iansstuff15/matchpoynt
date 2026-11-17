import { Users } from 'lucide-react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { usePlanAttendees } from '@/utils/hooks/useDirectory'

/** "Who's coming" for a planned session: the roster's names and places left, loaded when opened. */
export default function PlanAttendeesDialog({ handle, planId, title }: { handle: string; planId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const attendees = usePlanAttendees(handle, planId, open)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Who's coming to ${title}`}>
          <Users />
          Who's coming
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Who's coming</DialogTitle>
          <DialogDescription>
            {title}
            {attendees.data?.spotsLeft != null && ` · ${attendees.data.spotsLeft} ${attendees.data.spotsLeft === 1 ? 'place' : 'places'} left`}
          </DialogDescription>
        </DialogHeader>
        {attendees.isError ? (
          <ErrorBanner error={attendees.error} action="load who's coming" onRetry={() => void attendees.refetch()} />
        ) : !attendees.data ? (
          <ul className="grid gap-2" aria-busy="true" aria-label="Loading who's coming">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-5 w-40" />
              </li>
            ))}
          </ul>
        ) : attendees.data.names.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has signed up yet.</p>
        ) : (
          <ul className="grid gap-2" aria-label={`Players coming to ${title}`}>
            {attendees.data.names.map((name) => (
              <li key={name} className="text-sm font-medium">
                {name}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
