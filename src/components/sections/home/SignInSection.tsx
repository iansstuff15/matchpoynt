import { useRef } from 'react'
import { landingSection } from '@/animations/landingSection'
import { useMotion } from '@/animations/useMotion'
import { ArrowRight, CircleCheck, LayoutGrid, Users } from 'lucide-react'
import { Link } from 'react-router'
import AuthCard from '@/components/auth/AuthCard'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import SignInCard from '@/components/auth/SignInCard'
import SectionHeading from '@/components/landing/SectionHeading'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

const points = ['A fair queue from the first match', 'Scores checked against each sport’s rules', 'A live leaderboard players can open on their phones']

/** Closing section: the pitch on the left, the sign-in card on the right. */
export default function SignInSection() {
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, landingSection)
  const { web } = useFeatures()
  const me = useMe()
  const user = me.data?.user ?? null

  const card = !web.signIn ? (
    <AuthCard title="Run a session" description="No account needed: sessions stay with this browser.">
      <Button size="lg" className="w-fit rounded-full px-6" asChild>
        <Link to="/app">
          <Users />
          Start as a guest
        </Link>
      </Button>
    </AuthCard>
  ) : me.isLoading ? (
    <AuthCardSkeleton />
  ) : user ? (
    <AuthCard title={`Welcome back${user.displayName ? `, ${user.displayName}` : ''}`} description="Your session board is ready.">
      <Button size="lg" className="w-fit rounded-full px-6" asChild>
        <Link to={user.profileComplete ? '/app' : '/complete-profile'}>
          <LayoutGrid />
          {user.profileComplete ? 'Open the session board' : 'Finish your profile'}
          <ArrowRight />
        </Link>
      </Button>
    </AuthCard>
  ) : (
    <SignInCard title="Sign in to get on court" />
  )

  return (
    <section ref={ref} id="sign-in" aria-labelledby="signin-title" className="section-deep bg-deep-strong py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div className="grid gap-8">
          <SectionHeading
            id="signin-title"
            align="left"
            eyebrow="05 / ~/sign-in"
            parts={[{ text: 'Your next club night ' }, { text: 'starts here.', strong: true }]}
            lead="Sign in to set up courts, add players and let Matchpoynt call the next match."
          />
          <ul className="grid gap-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-deep-muted" data-reveal>
                <CircleCheck className="size-5 shrink-0 text-mesh-2" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-foreground" data-reveal>
          {card}
        </div>
      </div>
    </section>
  )
}
