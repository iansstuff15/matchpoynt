import { useRef, type ReactNode } from 'react'
import { playEntrance } from '@/animations/playMotion'
import { useMotion } from '@/animations/useMotion'

/** Plays Playing now's entrance over its loaded content: cards and rows rising in, figures counting up. */
export default function PlayReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useMotion(ref, playEntrance)
  return (
    <div ref={ref} className="grid gap-6">
      {children}
    </div>
  )
}
