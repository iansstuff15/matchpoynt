import type { PlayerLiveInfo } from '@matchpoynt/shared'
import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** The session's settings players care about: format, time limit, courts, how the queue works and the fee, worded by the API. */
export default function PlayerSessionInfoCard({ info, typicalMatchMinutes }: { info: PlayerLiveInfo; typicalMatchMinutes: number }) {
  const rows = [
    { label: 'Format', value: info.format },
    { label: 'Time limit', value: info.timeLimit ?? 'No limit' },
    { label: 'Courts', value: String(info.courts) },
    { label: 'Matches take', value: `About ${typicalMatchMinutes} min` },
    { label: 'Queue', value: info.queueing },
    ...(info.fee ? [{ label: 'Fee', value: info.fee }] : []),
  ]
  return (
    <Card data-play-reveal aria-labelledby="play-info-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="play-info-title" className="flex items-center gap-2">
            <Info className="size-5" aria-hidden />
            About this session
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
