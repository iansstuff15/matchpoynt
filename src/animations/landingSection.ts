import { revealSection } from '@/animations/revealSection'
import { waveHeading } from '@/animations/waveHeading'

/** A landing section's motion: its [data-wave] heading rides in on a wave, its [data-reveal] items rise in order. */
export function landingSection(section: HTMLElement) {
  const heading = section.querySelector<HTMLElement>('[data-wave]')
  const cleanups = [heading ? waveHeading(heading) : () => undefined, revealSection(section)]
  return () => cleanups.forEach((fn) => fn())
}
