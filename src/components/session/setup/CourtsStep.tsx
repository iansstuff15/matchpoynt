import { Plus } from 'lucide-react'
import { useId } from 'react'
import SportSelect from '@/components/sports/SportSelect'
import CourtRow from '@/components/session/setup/CourtRow'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { sessionDefaults, type SessionSetupInput } from '@matchpoynt/shared'
import type { SetupMode } from '@/types/session'
import { newCourtDraft, withSport, type DraftLocks } from '@/utils/forms/sessionDraft'

interface CourtsStepProps {
  setup: SessionSetupInput
  mode: SetupMode
  locks: DraftLocks
  onChange: (setup: SessionSetupInput) => void
}

export default function CourtsStep({ setup, mode, locks, onChange }: CourtsStepProps) {
  const sportId = useId()
  const { courts } = setup
  const setCourts = (next: SessionSetupInput['courts']) => onChange({ ...setup, courts: next })

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor={sportId}>Sport</Label>
        <SportSelect
          id={sportId}
          value={setup.sportId}
          onChange={(next) => onChange(withSport(setup, next))}
          disabled={mode === 'edit'}
        />
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground">A session is for one sport. Start a new session to switch.</p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Courts ({courts.length})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCourts([...courts, newCourtDraft(courts.length)])}
            disabled={courts.length >= sessionDefaults.maxCourts}
          >
            <Plus />
            Add court
          </Button>
        </div>
        <ul className="grid gap-2">
          {courts.map((court) => (
            <CourtRow
              key={court.id}
              court={court}
              locked={locks.courtIds.has(court.id)}
              canRemove={courts.length > 1}
              onRename={(label) => setCourts(courts.map((c) => (c.id === court.id ? { ...c, label } : c)))}
              onRemove={() => setCourts(courts.filter((c) => c.id !== court.id))}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
