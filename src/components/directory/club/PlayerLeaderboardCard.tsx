import type { ClubStandingView } from '@matchpoynt/shared'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** The club's all-time leaderboard over its finished sessions, ranked by the API. */
export default function PlayerLeaderboardCard({ standings }: { standings: ClubStandingView[] }) {
  return (
    <Card aria-labelledby="player-leaderboard-title">
      <CardHeader>
        <CardTitle id="player-leaderboard-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Trophy className="size-5" aria-hidden />
          Club leaderboard
        </CardTitle>
        <CardDescription>Every finished session the club has run, most wins first.</CardDescription>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results yet. The leaderboard fills in after the club's first session.</p>
        ) : (
          <Table aria-labelledby="player-leaderboard-title">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">W–L</TableHead>
                <TableHead className="text-right">Win rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-display font-semibold">{s.rank}</TableCell>
                  <TableCell className="max-w-48 truncate font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.wins}–{s.losses}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.winRate === null ? '–' : `${s.winRate}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
