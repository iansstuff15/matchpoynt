import { photoPositions, type PhotoPosition } from '@matchpoynt/shared'
import { Check, LoaderCircle, Move, RotateCcw, ZoomIn } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/utils/cn'

interface PhotoAlignerProps {
  url: string
  label: string
  shape: 'cover' | 'avatar'
  position: PhotoPosition
  pending: boolean
  error: unknown
  onSave: (position: PhotoPosition) => void
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))
/** Arrow keys move the photo this far (percent), or 10× with Shift. */
const keyStep = 1

/**
 * Aligns a photo in its frame: drag it (or use the arrow keys) and zoom with
 * the slider. Only shapes the draft: the API checks and saves the position.
 */
export default function PhotoAligner({ url, label, shape, position, pending, error, onSave }: PhotoAlignerProps) {
  const [draft, setDraft] = useState(position)
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; start: PhotoPosition } | null>(null)
  const changed = draft.x !== position.x || draft.y !== position.y || draft.zoom !== position.zoom

  // Dragging the photo right shows more of its left side: the kept point moves left, scaled by the frame and zoom.
  const move = (dxPx: number, dyPx: number, start: PhotoPosition) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box) return
    setDraft({ ...start, x: clamp(start.x - (dxPx / box.width) * (100 / start.zoom)), y: clamp(start.y - (dyPx / box.height) * (100 / start.zoom)) })
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, start: draft }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) move(e.clientX - drag.current.x, e.clientY - drag.current.y, drag.current.start)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? keyStep * 10 : keyStep
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!delta) return
    e.preventDefault()
    setDraft((d) => ({ ...d, x: clamp(d.x + delta[0]!), y: clamp(d.y + delta[1]!) }))
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Move className="size-4" aria-hidden />
          Align
        </p>
        <p className="text-xs text-muted-foreground">Drag the photo or use the arrow keys.</p>
      </div>
      <div
        ref={frame}
        role="slider"
        tabIndex={0}
        aria-label={`${label} position`}
        aria-valuetext={`${Math.round(draft.x)}% across, ${Math.round(draft.y)}% down`}
        aria-valuenow={Math.round(draft.x)}
        className={cn('photo-aligner', shape === 'cover' ? 'photo-aligner-cover' : 'photo-aligner-avatar')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
      >
        <PositionedPhoto url={url} position={draft} />
      </div>
      {/* Radix names only the slider's thumb, so the group carries the name screen readers announce. */}
      <div className="flex items-center gap-3" role="group" aria-label={`${label} zoom`}>
        <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Slider
          min={photoPositions.zoomMin}
          max={photoPositions.zoomMax}
          step={0.05}
          value={[draft.zoom]}
          onValueChange={([zoom]) => zoom !== undefined && setDraft((d) => ({ ...d, zoom }))}
        />
        <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{draft.zoom.toFixed(2)}×</span>
      </div>
      {Boolean(error) && <ErrorBanner error={error} action={`align the ${label.toLowerCase()}`} onRetry={pending ? undefined : () => onSave(draft)} />}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft({ ...photoPositions.default })}>
          <RotateCcw />
          Centre
        </Button>
        <Button type="button" disabled={pending || !changed} onClick={() => onSave(draft)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Save position
        </Button>
      </div>
    </div>
  )
}
