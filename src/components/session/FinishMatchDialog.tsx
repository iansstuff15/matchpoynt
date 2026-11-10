import type { CourtView, FinishMatchInput, GameScore } from '@matchpoynt/shared'
import { Check, CircleSlash, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Sport } from '@/interfaces/Sport'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { describeScoring } from '@/utils/scoring/describe'

interface FinishMatchDialogProps {
  court: CourtView | null
  sport: Sport
  formatId: string
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (input: FinishMatchInput) => void
  onRetry: (input: FinishMatchInput) => void
}

type Row = { a: string; b: string }

/**
 * Asks for the score when a match ends. Shows one row per possible game and
 * sends only the filled rows; the server checks them against the sport's rules.
 */
function ScoreForm({ court, sport, formatId, pending, error, onSubmit, onRetry }: Omit<FinishMatchDialogProps, 'onOpenChange'> & { court: CourtView }) {
  const format = sport.scoring.find((f) => f.id === formatId)
  const games = format?.bestOf ?? 1
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: games }, () => ({ a: '', b: '' })))
  const unit = `${sport.terminology.scoreUnit}s`
  const sideName = (i: 0 | 1) => court.sides[i].map((p) => p.name).join(' & ') || `Side ${i + 1}`

  const filled: GameScore[] = rows
    .filter((r) => r.a !== '' && r.b !== '')
    .map((r) => ({ a: Number(r.a), b: Number(r.b) }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ games: filled })
  }
  const setCell = (i: number, side: keyof Row, value: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [side]: value.replace(/\D/g, '').slice(0, 2) } : r)))

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={`Score for ${court.label}`}>
      <DialogHeader>
        <DialogTitle className="font-display">Finish match on {court.label}</DialogTitle>
        <DialogDescription>
          {court.tournamentMatch && `${court.tournamentMatch.label}: the score decides who goes through. `}
          {format ? `${describeScoring(format, sport)}.` : ''} Enter {unit} for each game played.
        </DialogDescription>
      </DialogHeader>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="pb-2 font-medium">
              Game
            </th>
            <th scope="col" className="pb-2 font-medium">
              {sideName(0)}
            </th>
            <th scope="col" className="pb-2 font-medium">
              {sideName(1)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <th scope="row" className="py-1 pr-3 text-left font-medium">
                {i + 1}
              </th>
              {(['a', 'b'] as const).map((side, s) => (
                <td key={side} className="py-1 pr-3">
                  <Input
                    inputMode="numeric"
                    value={row[side]}
                    onChange={(e) => setCell(i, side, e.target.value)}
                    aria-label={`Game ${i + 1}, ${sideName(s as 0 | 1)} ${unit}`}
                    className="w-20 tabular-nums"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {Boolean(error) && (
        <ErrorBanner error={error} action={`save the result on ${court.label}`} onRetry={pending ? undefined : () => onRetry({ games: filled })} />
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {/* A tournament match needs a result (the API refuses one without). */}
        {court.tournament ? (
          <span />
        ) : (
          <Button type="button" variant="outline" disabled={pending} onClick={() => onSubmit({ games: [] })}>
            <CircleSlash />
            Finish without score
          </Button>
        )}
        <Button type="submit" disabled={pending || filled.length === 0}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Save result
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function FinishMatchDialog({ court, onOpenChange, ...props }: FinishMatchDialogProps) {
  return (
    <Dialog open={court !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{/* Keyed by the match and its start, so a restarted match opens with a blank score. */}
        {court && <ScoreForm key={`${court.matchId}-${court.startedAt}`} court={court} {...props} />}</DialogContent>
    </Dialog>
  )
}
