import { LoaderCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddCourtButtonProps {
  pending: boolean
  /** From the API: why no more courts can be added, or `null`. */
  blockedReason: string | null
  onAdd: () => void
}

/** Sits on the add-player row, above the courts. The API names the new court and fills it if auto-fill is on. */
export default function AddCourtButton({ pending, blockedReason, onAdd }: AddCourtButtonProps) {
  return (
    <div className="grid gap-1">
      <Button variant="outline" onClick={onAdd} disabled={pending || blockedReason !== null} title={blockedReason ?? 'Add a court; the API names it'}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Add court
      </Button>
      {blockedReason && <p className="max-w-56 text-xs text-muted-foreground">{blockedReason}</p>}
    </div>
  )
}
