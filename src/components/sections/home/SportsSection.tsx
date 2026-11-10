import { useRef } from 'react'
import { landingSection } from '@/animations/landingSection'
import { useMotion } from '@/animations/useMotion'
import SectionHeading from '@/components/landing/SectionHeading'
import { sportList } from '@/config/sports'

export default function SportsSection() {
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, landingSection)
  return (
    <section ref={ref} aria-labelledby="sports-title" className="section-deep bg-deep-strong py-28">
      <div className="container-page grid gap-14">
        <SectionHeading
          id="sports-title"
          eyebrow="03 / ~/sports"
          parts={[{ text: 'One app for ' }, { text: 'every court', strong: true }, { text: ' in the building.' }]}
          lead="Scoring formats, skill tiers and fee labels are set per sport, and a player can hold a different tier in each."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sportList.map((sport) => {
            const Icon = sport.icon
            return (
              <li key={sport.id} data-reveal>
                  <article className="glass-panel grid h-full content-start gap-4 p-7">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-mesh-2 text-deep-strong">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <h3 className="text-xl font-semibold">{sport.name}</h3>
                    </div>
                    <p className="text-deep-muted">{sport.description}</p>
                    <ul className="flex flex-wrap gap-2">
                      {sport.scoring.map((f) => (
                        <li key={f.id} className="rounded-md border border-glass-border px-2 py-1 font-mono text-xs">
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
