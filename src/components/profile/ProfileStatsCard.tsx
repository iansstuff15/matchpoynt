import type { ProfileStats } from '@matchpoynt/shared'
import { ChartColumn } from 'lucide-react'
import RecordFigures from '@/components/profile/RecordFigures'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Their record across their clubs' sessions: sessions, matches, wins, losses and win rate. */
export default function ProfileStatsCard({ stats }: { stats: ProfileStats }) {
  return (
    <Card aria-labelledby="profile-stats-title">
      <CardHeader>
        <CardTitle id="profile-stats-title" className="flex items-center gap-2 font-display">
          <ChartColumn className="size-5" aria-hidden />
          Record
        </CardTitle>
        <CardDescription>Across your clubs' sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <RecordFigures stats={stats} />
      </CardContent>
    </Card>
  )
}
