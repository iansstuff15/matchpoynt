import type { ComponentProps } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface CoverCardProps extends ComponentProps<typeof Card> {
  /** Photo shown behind the card's content; without one it's a plain card. */
  coverUrl: string | null
}

/** A card with a cover photo as its background, shaded so its text stays readable (`.cover-card`). */
export default function CoverCard({ coverUrl, className, style, children, ...props }: CoverCardProps) {
  return (
    <Card
      {...props}
      data-cover={coverUrl ? '' : undefined}
      className={cn('cover-card', className)}
      style={coverUrl ? { ...style, backgroundImage: `url("${coverUrl}")` } : style}
    >
      {coverUrl && <span className="cover-card-scrim" aria-hidden />}
      {children}
    </Card>
  )
}
