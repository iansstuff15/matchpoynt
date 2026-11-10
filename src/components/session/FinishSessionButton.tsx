import { CircleStop, LoaderCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface FinishSessionButtonProps {
  /** Why it can't finish yet (a match is on court), from the API; `null` when it can. */
  blockedReason: string | null
  pending: boolean
  onConfirm: () => void
}

/**
 * Ends the session after confirmation. Finished results stay on the
 * leaderboard; check-in closes. Not while a match is on court: the API refuses,
 * and the button says why.
 */
export default function FinishSessionButton({ blockedReason, pending, onConfirm }: FinishSessionButtonProps) {
  const trigger = (
    <Button variant="destructive" disabled={pending || blockedReason !== null}>
      {pending ? <LoaderCircle className="animate-spin" /> : <CircleStop />}
      Finish session
    </Button>
  )
  if (blockedReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button gets no pointer events: the wrapper shows the reason. */}
          <span tabIndex={0} aria-label={`Finish session: ${blockedReason}`}>
            {trigger}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{blockedReason}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish this session?</AlertDialogTitle>
          <AlertDialogDescription>
            Results stay on the leaderboard, and check-in closes. You can't reopen a finished session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep playing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            <CircleStop />
            Finish session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
