import { feeKinds, type CreateClubInput } from '@matchpoynt/shared'
import type { ReactNode } from 'react'
import ThemeSwatch from '@/components/club/ThemeSwatch'
import { formatMoney } from '@/utils/forms/money'
import { useFeatures } from '@/utils/hooks/useFeatures'

const Default = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground">{children}</span>

/** The new club as it will be created, marking what keeps its default. */
export default function CreateClubReview({ club }: { club: CreateClubInput }) {
  const { web } = useFeatures()
  const { theme, fee } = club
  const rows: { term: string; value: ReactNode }[] = [
    { term: 'Name', value: club.name.trim() || <Default>Not set yet: go back to Details</Default> },
    { term: 'Handle', value: club.handle.trim() ? `@${club.handle.trim().toLowerCase()}` : <Default>Not set yet: go back to Details</Default> },
    { term: 'Description', value: club.description?.trim() || <Default>None (add it any time)</Default> },
    {
      term: 'Colours',
      value: theme ? (
        <span className="flex items-center gap-2">
          <ThemeSwatch colors={theme} />
          {[theme.accent, theme.sidebar, theme.page].map((c) => c ?? 'Matchpoynt').join(' · ')}
        </span>
      ) : (
        <Default>Matchpoynt’s own (default)</Default>
      ),
    },
    ...(web.fees
      ? [
          {
            term: 'Fee scheme',
            value: fee ? (
              `${feeKinds[fee.kind].label} · ${[fee.kind !== 'per-game' && formatMoney(fee.base, fee.currency), fee.kind !== 'fixed' && `${formatMoney(fee.perGame, fee.currency)} per game`].filter(Boolean).join(' + ')}`
            ) : (
              <Default>No fee (default)</Default>
            ),
          },
        ]
      : []),
  ]
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]" aria-label="The new club">
      {rows.map((row) => (
        <div key={row.term} className="contents">
          <dt className="text-muted-foreground">{row.term}</dt>
          <dd className="min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
