import { useParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PersonAboutCard from '@/components/person/PersonAboutCard'
import PersonClubsCard from '@/components/person/PersonClubsCard'
import PersonFriendButton from '@/components/person/PersonFriendButton'
import PersonHero from '@/components/person/PersonHero'
import PersonProfileSkeleton from '@/components/person/PersonProfileSkeleton'
import PageMeta from '@/components/seo/PageMeta'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useFriendActions } from '@/utils/hooks/useFriends'
import { usePerson } from '@/utils/hooks/usePerson'

/** `/u/<username>`: someone's public profile (photo, city, sports, links and clubs), with adding them as a friend. */
export default function PersonProfilePage() {
  const username = (useParams().username ?? '').toLowerCase()
  const { web } = useFeatures()
  const person = usePerson(username)
  const actions = useFriendActions()
  const { add, answer, remove } = actions
  const failed = [add, answer, remove].find((m) => m.isError)

  return (
    <section aria-labelledby="person-title" className="app-page">
      <PageMeta title={`@${username}`} description={`@${username}'s profile on Matchpoynt: their sports, clubs and links.`} />
      {failed && <ErrorBanner error={failed.error} action={`change your friendship with @${username}`} />}
      {person.isError ? (
        <ErrorBanner error={person.error} action={`load @${username}'s profile`} onRetry={() => void person.refetch()} />
      ) : !person.data ? (
        <PersonProfileSkeleton />
      ) : (
        <>
          <PersonHero person={person.data} action={<PersonFriendButton person={person.data} actions={actions} />} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <PersonAboutCard person={person.data} />
            {web.clubs && <PersonClubsCard person={person.data} linked={web.clubDirectory} />}
          </div>
        </>
      )}
    </section>
  )
}
