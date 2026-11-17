import { Link, useParams } from 'react-router'
import { homePath } from '@/utils/platform'
import LogoMark from '@/components/brand/LogoMark'
import AuthCardSkeleton from '@/components/auth/AuthCardSkeleton'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import JoinAction from '@/components/directory/join/JoinAction'
import JoinCardHeader from '@/components/directory/join/JoinCardHeader'
import JoinProfileStep from '@/components/directory/join/JoinProfileStep'
import JoinSignedOut from '@/components/directory/join/JoinSignedOut'
import ConnectionBanner from '@/components/feedback/ConnectionBanner'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { useJoinCard } from '@/utils/hooks/useDirectory'
import { useMe } from '@/utils/hooks/useMe'

/**
 * A club's join page (`/join/<handle>`, the club QR's link): the club's
 * cover full-bleed behind one card, like a chat server's invite. Signed out,
 * the card signs in or up (Google too); with details missing, it asks for
 * them; then it joins, or asks the club, and shows the club's welcome.
 */
export default function JoinClubPage() {
  const { handle = '' } = useParams()
  const card = useJoinCard(handle)
  const me = useMe()
  const user = me.data?.user ?? null
  const next = `/join/${handle}`

  return (
    <div className="join-stage">
      <PageMeta
        title={card.data ? `Join ${card.data.name}` : 'Join a club'}
        description={card.data ? `You're invited to join ${card.data.name} (@${card.data.handle}) on ${site.name}.` : `Join a club on ${site.name}.`}
      />
      {card.data?.coverUrl && <PositionedPhoto url={card.data.coverUrl} position={card.data.coverPosition} alt="" className="join-stage-photo" />}
      <div className="join-stage-scrim" aria-hidden />
      <header className="relative z-10 px-6 py-5 sm:px-10">
        <Link to={homePath()} className="inline-flex items-center text-white" aria-label={`${site.name} home`} title={`${site.name} home`}>
          <LogoMark className="h-8 w-auto" />
        </Link>
      </header>
      <ConnectionBanner />
      <main className="relative z-10 flex flex-1 items-center px-4 pb-10">
        <section className="join-card" aria-labelledby="join-title">
          {card.isError ? (
            <>
              <h1 id="join-title" className="font-display text-xl font-bold">
                Couldn't open this invite
              </h1>
              <ErrorBanner error={card.error} action="open the club's invite" onRetry={() => void card.refetch()} />
            </>
          ) : !card.data || me.isPending ? (
            <div className="grid justify-items-center gap-3" aria-busy="true" aria-label="Loading the invite">
              <Skeleton className="size-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
              <AuthCardSkeleton />
            </div>
          ) : (
            <>
              <JoinCardHeader card={card.data} line={user ? "You're invited to join" : 'Sign in to join'} />
              {!user ? (
                <JoinSignedOut next={next} />
              ) : !user.profileComplete ? (
                <JoinProfileStep onDone={() => void me.refetch()} />
              ) : (
                <JoinAction handle={handle} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
