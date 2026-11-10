import { clubImages, type PlannedSessionView } from '@matchpoynt/shared'
import { CalendarDays, ImageMinus, ImageUp, LandPlot, LoaderCircle, Pencil, Play, Trash2, Users } from 'lucide-react'
import { useRef } from 'react'
import CoverCard from '@/components/club/CoverCard'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

interface PlannedSessionCardProps {
  plan: PlannedSessionView
  starting: boolean
  coverBusy: boolean
  deleting: boolean
  onStart: () => void
  onEdit: () => void
  onUploadCover: (file: File) => void
  onRemoveCover: () => void
  onDelete: () => void
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** A planned session, with its cover photo as the card's background. Starting it opens the board. */
export default function PlannedSessionCard({ plan, starting, coverBusy, deleting, onStart, onEdit, onUploadCover, onRemoveCover, onDelete }: PlannedSessionCardProps) {
  const sport = sports[plan.sportId]
  const SportIcon = sport.icon
  const file = useRef<HTMLInputElement>(null)

  return (
    <CoverCard coverUrl={plan.coverUrl} className="h-full gap-4" aria-labelledby={`plan-${plan.id}`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <SportIcon className="size-4" aria-hidden />
          {sport.name}
        </CardDescription>
        <CardTitle id={`plan-${plan.id}`} className="line-clamp-2 font-display text-lg" title={plan.title}>
          {plan.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid flex-1 content-start gap-1.5 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {plan.scheduledFor ? <time dateTime={plan.scheduledFor}>{formatWhen(plan.scheduledFor)}</time> : 'No date set'}
        </p>
        <p className="flex items-center gap-2">
          <LandPlot className="size-4 shrink-0" aria-hidden />
          {plural(plan.courts.length, 'court')}
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4 shrink-0" aria-hidden />
          {plural(plan.memberIds.length, 'member')} on the roster
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={onStart} disabled={starting} className="flex-1">
          {starting ? <LoaderCircle className="animate-spin" /> : <Play />}
          Start session
        </Button>
        <Button variant="secondary" size="icon" onClick={onEdit} aria-label={`Edit ${plan.title}`} title="Edit plan">
          <Pencil />
        </Button>
        <input
          ref={file}
          type="file"
          accept={clubImages.types.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onUploadCover(picked)
            e.target.value = ''
          }}
        />
        <Button
          variant="secondary"
          size="icon"
          disabled={coverBusy}
          onClick={() => file.current?.click()}
          aria-label={plan.coverUrl ? `Replace the cover photo of ${plan.title}` : `Add a cover photo to ${plan.title}`}
          title={plan.coverUrl ? 'Replace cover photo' : 'Add cover photo'}
        >
          {coverBusy ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
        </Button>
        {plan.coverUrl && (
          <Button variant="secondary" size="icon" disabled={coverBusy} onClick={onRemoveCover} aria-label={`Remove the cover photo of ${plan.title}`} title="Remove cover photo">
            <ImageMinus />
          </Button>
        )}
        <ConfirmButton
          iconOnly
          variant="destructive"
          label={`Delete ${plan.title}`}
          icon={Trash2}
          title={`Delete ${plan.title}?`}
          description="The plan and its cover photo are removed. Nothing has been played yet, so no results are lost."
          confirmLabel="Delete plan"
          cancelLabel="Keep plan"
          pending={deleting}
          onConfirm={onDelete}
        />
      </CardFooter>
    </CoverCard>
  )
}
