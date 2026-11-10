import { cn } from '@/utils/cn'

export interface HeadingPart {
  text: string
  /** Emphasised words render bright; the rest stay in the muted tint. */
  strong?: boolean
}

interface SectionHeadingProps {
  id: string
  /** Mono eyebrow, e.g. "02 / ~/how-it-works". */
  eyebrow: string
  parts: HeadingPart[]
  lead?: string
  as?: 'h1' | 'h2'
  size?: 'xl' | 'lg'
  align?: 'center' | 'left'
}

/** Mono eyebrow, a heavy tight headline with highlighted words, and a lead line. Marked for GSAP: [data-wave] headline, [data-reveal] lines. */
export default function SectionHeading({ id, eyebrow, parts, lead, as: Tag = 'h2', size = 'lg', align = 'center' }: SectionHeadingProps) {
  return (
    // minmax(0, 1fr): giant headlines must shrink to the screen, not stretch the column.
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-5', align === 'center' ? 'justify-items-center text-center' : 'justify-items-start')}>
      <p className="eyebrow-mono" data-reveal>
        {eyebrow}
      </p>
      <Tag id={id} data-wave className={cn(size === 'xl' ? 'headline-xl max-w-[14ch]' : 'headline-lg max-w-[20ch]', 'text-deep-muted')}>
        {parts.map((p, i) => (
          <span key={i} className={cn(p.strong && 'text-deep-foreground')}>
            {p.text}
          </span>
        ))}
      </Tag>
      {lead && (
        <p className="max-w-[46ch] text-lg text-deep-muted" data-reveal>
          {lead}
        </p>
      )}
    </div>
  )
}
