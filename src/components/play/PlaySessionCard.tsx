import type { PlayerLiveSummary } from '@matchpoynt/shared'
import { ArrowRight, Radio } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

/** One running session you're in, opening its live view. */
export default function PlaySessionCard({ session }: { session: PlayerLiveSummary }) {
  return (
    <Card className="transition-colors hover:border-primary/60">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Link to={`/play/${session.sessionId}`} className="after:absolute after:inset-0 focus-visible:outline-none" title={`Open ${session.title}: your wait, the courts and the queue`}>
            {session.title}
          </Link>
          <Badge className="gap-1">
            <Radio aria-hidden />
            Live
          </Badge>
          <ArrowRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
        </CardTitle>
        <CardDescription>{[session.clubName, sports[session.sportId].name, `started ${formatWhen(session.startedAt)}`].join(' · ')}</CardDescription>
      </CardHeader>
    </Card>
  )
}
