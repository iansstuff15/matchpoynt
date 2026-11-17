import { Wallet } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** What the club usually charges for a session (its fee scheme, worded by the API). */
export default function PlayerFeesCard({ summary }: { summary: string | null }) {
  return (
    <Card aria-labelledby="player-fees-title">
      <CardHeader>
        <CardTitle id="player-fees-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Wallet className="size-5" aria-hidden />
          Fees
        </CardTitle>
        <CardDescription>{summary ? `${summary}. Each session can set its own.` : 'No usual fee. Each session can set its own.'}</CardDescription>
      </CardHeader>
    </Card>
  )
}
