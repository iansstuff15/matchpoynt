import { Trophy } from 'lucide-react'
import { useState } from 'react'
import PageMeta from '@/components/seo/PageMeta'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { defaultSportId, sportList, sports } from '@/config/sports'
import type { SportId } from '@matchpoynt/shared'

/** Season rankings per sport. The API endpoint for these comes with seasons. */
export default function RankingsPage() {
  const [sportId, setSportId] = useState<SportId>(defaultSportId)

  return (
    <section aria-labelledby="rankings-title" className="section">
      <PageMeta title="Rankings" description="Player rankings for every sport on Matchpoynt, by season and skill tier." />
      <div className="container-page">
        <p className="section-eyebrow">Rankings</p>
        <h1 id="rankings-title" className="section-title">
          Who's on top, sport by sport
        </h1>
        <p className="section-lead">Each sport ranks separately, so a player's standing in one never affects another.</p>
        <Tabs value={sportId} onValueChange={(v) => setSportId(v as SportId)} className="mt-10">
          <TabsList className="h-auto flex-wrap">
            {sportList.map(({ id, name, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon aria-hidden />
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={sportId} className="mt-6">
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Trophy />
                </EmptyMedia>
                <EmptyTitle>No {sports[sportId].name.toLowerCase()} season rankings yet</EmptyTitle>
                <EmptyDescription>Season rankings arrive with seasons. Session leaderboards are live now.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
