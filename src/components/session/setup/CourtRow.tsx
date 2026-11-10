import { Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CourtSetup } from '@matchpoynt/shared'

interface CourtRowProps {
  court: CourtSetup
  locked: boolean
  canRemove: boolean
  onRename: (label: string) => void
  onRemove: () => void
}

export default function CourtRow({ court, locked, canRemove, onRename, onRemove }: CourtRowProps) {
  return (
    <li className="flex items-center gap-2">
      <Input
        value={court.label}
        onChange={(e) => onRename(e.target.value)}
        aria-label="Court name"
        className="flex-1"
      />
      {locked ? (
        <span className="inline-flex w-24 items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          In play
        </span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="w-24"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${court.label || 'court'}`}
        >
          <Trash2 />
          Remove
        </Button>
      )}
    </li>
  )
}
