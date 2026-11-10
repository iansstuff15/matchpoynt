import { ArrowRight, UserPlus } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router'
import { heroEntrance } from '@/animations/heroEntrance'
import { useMotion } from '@/animations/useMotion'
import SectionHeading from '@/components/landing/SectionHeading'
import SportsMarquee from '@/components/landing/SportsMarquee'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { sportList } from '@/config/sports'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/** Framed full-height hero: mesh gradient, giant headline, two actions and the sports strip. Enters after the splash hands over. */
export default function HeroSection() {
  const { web } = useFeatures()
  const me = useMe()
  const signedOut = web.signIn && me.isSuccess && !me.data.user
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, heroEntrance)

  return (
    <section ref={ref} aria-labelledby="hero-title" className="frame-hero flex min-h-[calc(100svh-1rem)] items-center py-28 sm:min-h-[calc(100svh-2rem)]">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] justify-items-center gap-10 text-center">
        <div className="w-full min-w-0">
          <SectionHeading
            id="hero-title"
            as="h1"
            size="xl"
            eyebrow={`01 / ~/club-night · ${sportList.length} sports`}
            parts={[{ text: 'Fair queues. Full courts. ' }, { text: 'Every sport.', strong: true }]}
            lead={`${site.name} keeps the queue fair, the courts full and the scores straight, whatever your club plays.`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3" data-reveal>
          <Button size="lg" className="rounded-full px-6" asChild>
            <Link to="/app" title="Open the session board and start a session">
              Run a session
              <ArrowRight />
            </Link>
          </Button>
          {signedOut && web.signUp && (
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full border border-glass-border bg-glass px-6 text-deep-foreground backdrop-blur-xl hover:bg-white/20 hover:text-deep-foreground"
              asChild
            >
              <Link to="/sign-up" title="Create a Matchpoynt account">
                <UserPlus />
                Create an account
              </Link>
            </Button>
          )}
        </div>
        <div className="flex w-full justify-center" data-reveal>
          <SportsMarquee />
        </div>
      </div>
    </section>
  )
}
