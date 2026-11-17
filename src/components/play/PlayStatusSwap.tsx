import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { swapStatus } from '@/animations/playMotion'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

interface PlayStatusSwapProps {
  /** Which card is showing: "You are now playing" or where they stand while they wait. A change animates. */
  mode: string
  children: ReactNode
}

/** A copy of what's on screen, to animate away once React has replaced it (ids dropped so they aren't repeated). */
function snapshot(el: HTMLElement): HTMLElement {
  // Its contents only: the wrapper itself may be mid-animation.
  const copy = document.createElement('div')
  el.childNodes.forEach((node) => copy.appendChild(node.cloneNode(true)))
  copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'))
  return copy
}

/**
 * The top of Playing now. When the viewer goes on or off court, the card on
 * screen hands over to the next: the old one lifts away while the new one
 * rises in, and the space between them resizes smoothly instead of jumping.
 * The old card leaves as a copy of how it last looked.
 */
export default function PlayStatusSwap({ mode, children }: PlayStatusSwapProps) {
  const root = useRef<HTMLDivElement>(null)
  const outgoing = useRef<HTMLDivElement>(null)
  const incoming = useRef<HTMLDivElement>(null)
  const last = useRef<{ mode: string; copy: HTMLElement | null }>({ mode, copy: null })

  // A new mode: the last copy of the old card leaves while the new one comes in.
  useLayoutEffect(() => {
    const [box, from, to] = [root.current, outgoing.current, incoming.current]
    const previous = last.current
    if (previous.mode === mode || !previous.copy || !box || !from || !to || prefersReducedMotion()) return
    from.replaceChildren(previous.copy)
    const tl = swapStatus(box, from, to, () => from.replaceChildren())
    return () => {
      tl.kill()
      from.replaceChildren()
    }
  }, [mode])

  // After every render: remember the mode and how the card looks now.
  useLayoutEffect(() => {
    if (incoming.current) last.current = { mode, copy: snapshot(incoming.current) }
  })

  return (
    <div ref={root} className="relative">
      <div ref={outgoing} aria-hidden className="pointer-events-none absolute inset-x-0 top-0" />
      <div ref={incoming}>{children}</div>
    </div>
  )
}
