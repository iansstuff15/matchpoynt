import type { ProfileRecordView } from '@matchpoynt/shared'
import { Building2, ChartColumn } from 'lucide-react'
import RecordFigures from '@/components/profile/RecordFigures'
import SportTag from '@/components/record/SportTag'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'

/** Their record overall, then one card per sport and one per club, busiest first. */
export default function RecordBreakdown({ record }: { record: ProfileRecordView }) {
  return (
    <div className="grid gap-4">
      <Card aria-labelledby="record-total-title">
        <CardHeader>
          <CardTitle className="font-display">
            <h2 id="record-total-title" className="flex items-center gap-2">
              <ChartColumn className="size-5" aria-hidden />
              All sports and clubs
            </h2>
          </CardTitle>
          <CardDescription>Every match you played in your clubs' sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecordFigures stats={record.stats} />
        </CardContent>
      </Card>
      {record.bySport.length > 0 && (
        <section aria-labelledby="record-sports-title" className="grid gap-3">
          <h2 id="record-sports-title" className="font-display text-lg font-bold">
            By sport
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {record.bySport.map((s) => {
              const Icon = sports[s.sportId].icon
              return (
                <li key={s.sportId}>
                  <Card className="h-full gap-3 py-4">
                    <CardHeader className="px-4">
                      <CardTitle className="flex items-center gap-2 font-display">
                        <Icon className="size-5" aria-hidden />
                        {sports[s.sportId].name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                      <RecordFigures stats={s.stats} compact />
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {record.byClub.length > 0 && (
        <section aria-labelledby="record-clubs-title" className="grid gap-3">
          <h2 id="record-clubs-title" className="font-display text-lg font-bold">
            By club
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {record.byClub.map((c) => (
              <li key={c.clubId}>
                <Card className="h-full gap-3 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="flex items-center gap-2 font-display">
                      <Building2 className="size-5" aria-hidden />
                      <span className="truncate">{c.clubName}</span>
                    </CardTitle>
                    {c.sportIds.length > 0 && (
                      <CardDescription className="flex flex-wrap gap-1.5">
                        {c.sportIds.map((id) => (
                          <SportTag key={id} sportId={id} />
                        ))}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="px-4">
                    <RecordFigures stats={c.stats} compact />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
