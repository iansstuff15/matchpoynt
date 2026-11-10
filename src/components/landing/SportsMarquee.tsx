import { useRef } from 'react'
import { marquee } from '@/animations/marquee'
import { useMotion } from '@/animations/useMotion'
import { sportList } from '@/config/sports'

/** Glass strip of every supported sport, scrolling slowly; slows to a stop on hover or focus (static with reduced motion). */
export default function SportsMarquee() {
  const items = [...sportList, ...sportList]
  const ref = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  useMotion(ref, (root) => (trackRef.current ? marquee(root, trackRef.current) : undefined))
  return (
    <div ref={ref} className="glass-panel flex w-full max-w-2xl items-center gap-4 overflow-hidden rounded-full py-2.5 pr-0 pl-5">
      <p className="eyebrow-mono shrink-0 uppercase">Every court</p>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <ul ref={trackRef} className="flex w-max gap-6" aria-label="Supported sports">
          {items.map((sport, i) => {
            const Icon = sport.icon
            return (
              <li key={`${sport.id}-${i}`} aria-hidden={i >= sportList.length} className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                <Icon className="size-4" aria-hidden />
                {sport.name}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
