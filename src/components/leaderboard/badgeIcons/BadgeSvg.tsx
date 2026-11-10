import type { SVGProps } from 'react'
import type { BadgeShape } from '@/interfaces/BadgeArt'

interface BadgeSvgProps extends SVGProps<SVGSVGElement> {
  shapes: BadgeShape[]
}

/**
 * Draws a badge from its shapes (`config/badgeArt.ts`) as a 24×24 duotone
 * SVG in `currentColor`, so each icon takes the colour of its chip.
 */
export default function BadgeSvg({ shapes, ...props }: BadgeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      {shapes.map((s) => (
        <path
          key={s.d}
          d={s.d}
          className={s.ember ? 'fill-ember' : undefined}
          fill={s.ember ? undefined : s.fill !== undefined ? 'currentColor' : 'none'}
          fillOpacity={s.fill !== undefined && s.fill < 1 ? s.fill : undefined}
          stroke={s.stroke ? 'currentColor' : undefined}
          strokeOpacity={s.stroke?.opacity}
          strokeWidth={s.stroke?.width}
          strokeLinecap={s.stroke ? 'round' : undefined}
          strokeLinejoin={s.stroke ? 'round' : undefined}
        />
      ))}
    </svg>
  )
}
