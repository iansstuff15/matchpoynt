import { useRef } from 'react'
import { landingSection } from '@/animations/landingSection'
import { useMotion } from '@/animations/useMotion'
import { ListOrdered, Medal, Scale, Timer, Wallet, WifiOff } from 'lucide-react'
import SectionHeading from '@/components/landing/SectionHeading'

const items = [
  { icon: ListOrdered, title: 'Fair queueing', description: 'Players who have played least go next, so nobody sits out twice in a row.' },
  { icon: Timer, title: 'Court assignment', description: 'Fill an open court with the next fair group in one tap, or let auto-fill do it.' },
  { icon: Scale, title: 'Balanced matches', description: 'Skill tiers per sport keep games competitive.' },
  { icon: Medal, title: 'Leaderboards', description: 'Scores roll up into a live leaderboard you can share with a link.' },
  { icon: Wallet, title: 'Fees that add up', description: 'Court and equipment fees tracked per player, per session.' },
  { icon: WifiOff, title: 'Works at the venue', description: 'The desktop app keeps running when the gym Wi-Fi does not.' },
]

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, landingSection)
  return (
    <section ref={ref} aria-labelledby="features-title" className="section-deep py-28">
      <div className="container-page grid gap-14">
        <SectionHeading
          id="features-title"
          eyebrow="02 / ~/how-it-works"
          parts={[{ text: 'Everything a Queue Master juggles, ' }, { text: 'in one place.', strong: true }]}
          lead="Club nights run on fairness. Matchpoynt does the bookkeeping so you can watch the games."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, description }, i) => (
            <li key={title} data-reveal>
                <article className="glass-panel grid h-full content-start gap-3 p-7">
                  <span className="eyebrow-mono">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="size-6 text-mesh-2" aria-hidden />
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-deep-muted">{description}</p>
                </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
