import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Places gained or lost in the latest match, as the API reports it. */
export default function MovementTag({ movement }: { movement: number }) {
  if (movement === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground" aria-label="No change since the last match">
        <Minus className="size-3" aria-hidden />
      </span>
    )
  }
  const up = movement > 0
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', up ? 'text-success' : 'text-destructive')}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(movement)} since the last match`}
    >
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      {Math.abs(movement)}
    </span>
  )
}
