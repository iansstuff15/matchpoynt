import type { ClubView } from '@matchpoynt/shared'
import { Info, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import ThemeSwatch from '@/components/club/ThemeSwatch'
import SocialLinksList from '@/components/social/SocialLinksList'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface ClubInfoCardProps {
  view: ClubView
  onEdit: () => void
}

const colourText = (value: string | null) => value ?? 'Matchpoynt'

/** Club info, read only: name, @handle, links, description, colours, fee scheme and the roster's size. Editing is in the settings. */
export default function ClubInfoCard({ view, onEdit }: ClubInfoCardProps) {
  const { web } = useFeatures()
  const { club } = view
  const colors = club.theme?.colors ?? { accent: null, sidebar: null, page: null }
  const rows: { term: string; value: ReactNode }[] = [
    { term: 'Name', value: club.name },
    { term: 'Handle', value: club.handle ? `@${club.handle}` : <span className="text-muted-foreground">Not picked yet</span> },
    { term: 'Social links', value: <SocialLinksList links={club.socialLinks} label={`${club.name} links`} /> },
    { term: 'Description', value: club.description ?? <span className="text-muted-foreground">None yet</span> },
    {
      term: 'Colours',
      value: (
        <span className="flex items-center gap-2">
          <ThemeSwatch colors={colors} />
          <span className="text-muted-foreground tabular-nums">
            {club.theme ? `Accent ${colourText(colors.accent)} · sidebar ${colourText(colors.sidebar)} · page ${colourText(colors.page)}` : 'Matchpoynt’s own'}
          </span>
        </span>
      ),
    },
    ...(web.fees ? [{ term: 'Fee scheme', value: club.feeSummary ?? <span className="text-muted-foreground">No fee</span> }] : []),
    { term: 'Saved themes', value: club.savedThemes.length ? club.savedThemes.map((t) => t.name).join(', ') : <span className="text-muted-foreground">None</span> },
    { term: 'Members', value: String(club.members) },
    { term: 'Planned sessions', value: String(club.plannedSessions) },
    ...(web.clubBadges ? [{ term: 'Badges', value: String(view.badges.length) }] : []),
  ]

  return (
    <Card aria-labelledby="club-info-title">
      <CardHeader>
        <CardTitle id="club-info-title" className="flex items-center gap-2 font-display">
          <Info className="size-5" aria-hidden />
          Club info
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings />
            Edit settings
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          {rows.map((row) => (
            <div key={row.term} className="contents">
              <dt className="text-muted-foreground">{row.term}</dt>
              <dd className="min-w-0 break-words whitespace-pre-line">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
