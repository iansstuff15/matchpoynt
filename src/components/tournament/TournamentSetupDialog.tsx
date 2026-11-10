import { tournamentLimits, type PlayerView, type TournamentFormat, type TournamentSetupInput, type TournamentTeamBuild, type TournamentTeamMode, type TournamentSeeding } from '@matchpoynt/shared'
import { LoaderCircle, Trophy } from 'lucide-react'
import { useId, useState } from 'react'
import RadioCard from '@/components/common/RadioCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import TeamPicker from '@/components/tournament/TeamPicker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { tournamentFormats, tournamentSeedings, tournamentTeamBuilds, tournamentTeamModes } from '@/config/tournament'
import { tournamentInput, type TournamentDraft } from '@/utils/forms/tournamentDraft'

interface TournamentSetupDialogProps {
  open: boolean
  courtLabel: string
  initial: TournamentDraft
  /** Checked-in players who can take part. */
  players: PlayerView[]
  perSide: number
  pending: boolean
  /** The last failed setup. The API decides what's valid. */
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (input: TournamentSetupInput) => void
}

type FormProps = Omit<TournamentSetupDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }

/** Draft state lives here, so it resets every time the dialog opens. */
function SetupForm({ courtLabel, initial, players, perSide, pending, error, onSubmit, onCancel }: FormProps) {
  const [draft, setDraft] = useState(initial)
  const nameId = useId()
  const poolsId = useId()
  const advanceId = useId()
  const roundsId = useId()
  const set = (patch: Partial<TournamentDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const teams = perSide > 1
  const rotating = teams && draft.teamMode === 'rotating'
  const picked = new Set(draft.playerIds)
  const pickedPlayers = players.filter((p) => picked.has(p.id))
  const toggle = (id: string, on: boolean) => {
    const ids = on ? [...draft.playerIds, id] : draft.playerIds.filter((p) => p !== id)
    const teamOf = { ...draft.teamOf }
    if (!on) delete teamOf[id]
    set({ playerIds: ids, teamOf })
  }
  const submit = () => onSubmit(tournamentInput(draft))
  const number = (value: string, fallback: number) => (Number.isFinite(Number(value)) && value !== '' ? Number(value) : fallback)

  return (
    <form
      className="grid min-h-0 gap-6 overflow-y-auto pr-1"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action="set up the tournament" onRetry={pending ? undefined : submit} />}

      <div className="grid gap-2">
        <Label htmlFor={nameId}>Tournament name</Label>
        <Input id={nameId} value={draft.name} maxLength={tournamentLimits.nameMaxLength} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>Format</legend>
        </Label>
        <RadioGroup value={draft.format} onValueChange={(v) => set({ format: v as TournamentFormat })} className="sm:grid-cols-2">
          {tournamentFormats.map((f) => (
            <RadioCard key={f.id} value={f.id} title={f.label} description={f.description} icon={f.icon} disabled={rotating && f.id !== 'round-robin'} />
          ))}
        </RadioGroup>
      </fieldset>

      {draft.format === 'pools-knockout' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={poolsId}>Pools</Label>
            <Input
              id={poolsId}
              type="number"
              min={2}
              max={tournamentLimits.maxPools}
              value={draft.pools.count}
              onChange={(e) => set({ pools: { ...draft.pools, count: number(e.target.value, 2) } })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={advanceId}>Go through from each pool</Label>
            <Input
              id={advanceId}
              type="number"
              min={1}
              max={tournamentLimits.maxAdvancePerPool}
              value={draft.pools.advance}
              onChange={(e) => set({ pools: { ...draft.pools, advance: number(e.target.value, 1) } })}
            />
          </div>
        </div>
      )}

      {teams && (
        <fieldset className="grid gap-2">
          <Label asChild>
            <legend>Entrants</legend>
          </Label>
          <RadioGroup
            value={draft.teamMode}
            onValueChange={(v) => {
              const teamMode = v as TournamentTeamMode
              // Rotating partners is a round robin.
              set(teamMode === 'rotating' ? { teamMode, format: 'round-robin' } : { teamMode })
            }}
            className="sm:grid-cols-2"
          >
            {tournamentTeamModes.map((m) => (
              <RadioCard key={m.id} value={m.id} title={m.label} description={m.description} icon={m.icon} />
            ))}
          </RadioGroup>
        </fieldset>
      )}

      {teams && !rotating && (
        <fieldset className="grid gap-2">
          <Label asChild>
            <legend>Forming teams of {perSide}</legend>
          </Label>
          <RadioGroup value={draft.teamBuild} onValueChange={(v) => set({ teamBuild: v as TournamentTeamBuild })} className="sm:grid-cols-3">
            {tournamentTeamBuilds.map((b) => (
              <RadioCard key={b.id} value={b.id} title={b.label} description={b.description} icon={b.icon} />
            ))}
          </RadioGroup>
        </fieldset>
      )}

      {rotating && (
        <div className="grid gap-2">
          <Label htmlFor={roundsId}>Rounds</Label>
          <Input
            id={roundsId}
            type="number"
            min={1}
            max={tournamentLimits.maxRounds}
            className="w-28"
            value={draft.rounds}
            onChange={(e) => set({ rounds: number(e.target.value, 1) })}
          />
          <p className="text-xs text-muted-foreground">Each round draws new partners; whoever sat out last plays first.</p>
        </div>
      )}

      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>
            Players ({draft.playerIds.length} of {players.length} checked in)
          </legend>
        </Label>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has checked in yet. Players must be at the venue to enter.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-3">
            {players.map((p) => {
              const id = `tournament-player-${p.id}`
              return (
                <li key={p.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm">
                    <Checkbox id={id} checked={picked.has(p.id)} onCheckedChange={(on) => toggle(p.id, on === true)} />
                    <span className="min-w-0 truncate" title={p.name}>
                      {p.name}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </fieldset>

      {teams && !rotating && draft.teamBuild === 'manual' && pickedPlayers.length > 0 && (
        <TeamPicker players={pickedPlayers} perSide={perSide} teamOf={draft.teamOf} onChange={(teamOf) => set({ teamOf })} />
      )}

      {!rotating && (
        <fieldset className="grid gap-2">
          <Label asChild>
            <legend>Seeding</legend>
          </Label>
          <RadioGroup value={draft.seeding} onValueChange={(v) => set({ seeding: v as TournamentSeeding })} className="sm:grid-cols-2">
            {tournamentSeedings.map((s) => (
              <RadioCard key={s.id} value={s.id} title={s.label} description={s.description} icon={s.icon} />
            ))}
          </RadioGroup>
        </fieldset>
      )}

      <DialogFooter className="sticky bottom-0 bg-background pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Trophy />}
          Start tournament on {courtLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Opens when the first court is switched to tournament play: pick the format, entrants and seeding. */
export default function TournamentSetupDialog({ open, onOpenChange, ...formProps }: TournamentSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Set up a tournament</DialogTitle>
          <DialogDescription>
            {formProps.courtLabel} will play tournament matches only; other courts keep open play. Players in the tournament sit out open play until
            they're knocked out.
          </DialogDescription>
        </DialogHeader>
        {open && <SetupForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
