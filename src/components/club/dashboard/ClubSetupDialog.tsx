import type { ClubSetupItem } from '@matchpoynt/shared'
import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { clubSetupItems, type ClubSetupAction } from '@/config/clubSetup'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'

interface ClubSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  items: ClubSetupItem[]
  /** Opens a settings group or a photo's editor (this dialog closes first). */
  onAction: (action: ClubSetupAction) => void
}

/** "Finish setting up": what the club is still missing, from the API, each with the button that sets it up. Anything skipped keeps its default. */
export default function ClubSetupDialog({ open, onOpenChange, clubId, items, onAction }: ClubSetupDialogProps) {
  const missing = items.filter((i) => !i.done)
  const done = items.length - missing.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Finish setting up</DialogTitle>
          <DialogDescription>
            {done} of {items.length} done. Anything you skip keeps its default, and you can come back to this any time.
          </DialogDescription>
        </DialogHeader>
        <Progress value={(done / items.length) * 100} aria-label={`${done} of ${items.length} set up`} />
        <ul className="grid min-h-0 gap-2 overflow-y-auto sm:grid-cols-2" aria-label="Still to set up">
          {missing.map((item) => {
            const copy = clubSetupItems[item.id]
            const Icon = copy.icon
            const { action } = copy
            return (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium">{copy.label}</span>
                  <span className="text-xs text-muted-foreground">{copy.description}</span>
                </span>
                {'page' in action ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link to={clubPageHref(clubId, action.page)} onClick={() => onOpenChange(false)}>
                      {copy.button}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onOpenChange(false)
                      onAction(action)
                    }}
                  >
                    {copy.button}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {missing.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4" aria-hidden />
            Everything is set up.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep the defaults for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
