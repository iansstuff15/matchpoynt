import { CircleCheckBig } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Shown after a successful check-in. */
export default function CheckInDone({ name }: { name: string }) {
  return (
    <Card role="status" className="text-center">
      <CardHeader className="justify-items-center gap-3">
        <CircleCheckBig className="size-12 text-primary" aria-hidden />
        <CardTitle className="font-display text-2xl break-words">You're checked in, {name}</CardTitle>
        <CardDescription>You're in the queue. Watch the Queue Master's screen for your name and court.</CardDescription>
      </CardHeader>
    </Card>
  )
}
