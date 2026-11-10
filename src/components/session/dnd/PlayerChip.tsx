import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PlayerChipProps {
  name: string
  trailing?: ReactNode
  lifted?: boolean
  className?: string
}

/** A player's name with a grip, as shown on court sides and while dragging. */
export default function PlayerChip({ name, trailing, lifted, className }: PlayerChipProps) {
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-md bg-background/95 px-2 py-1 text-sm font-medium text-foreground shadow-sm',
        lifted && 'shadow-xl ring-2 ring-primary',
        className,
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate" title={name}>
        {name}
      </span>
      {trailing}
    </span>
  )
}
