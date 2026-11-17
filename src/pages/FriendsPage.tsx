import ErrorBanner from '@/components/feedback/ErrorBanner'
import FriendListCard from '@/components/friends/FriendListCard'
import FriendRequestsCard from '@/components/friends/FriendRequestsCard'
import FriendSearchCard from '@/components/friends/FriendSearchCard'
import FriendsSkeleton from '@/components/friends/FriendsSkeleton'
import PageMeta from '@/components/seo/PageMeta'
import { useFriendActions, useFriends } from '@/utils/hooks/useFriends'

/** `/friends`: finding and adding people, requests to answer and sent, and your friends. */
export default function FriendsPage() {
  const friends = useFriends()
  const actions = useFriendActions()
  const { add, answer, remove } = actions
  // The failed change, said in the user's words, with a retry that repeats it.
  const failed = add.isError
    ? { error: add.error, action: `ask ${add.variables?.name ?? 'them'} to be friends`, retry: () => add.variables && add.mutate(add.variables) }
    : answer.isError
      ? { error: answer.error, action: `${answer.variables?.accept ? 'accept' : 'decline'} ${answer.variables?.name ?? 'the'} request`, retry: () => answer.variables && answer.mutate(answer.variables) }
      : remove.isError
        ? { error: remove.error, action: remove.variables?.pending ? `cancel your request to ${remove.variables.name}` : `remove ${remove.variables?.name ?? 'your friend'}`, retry: () => remove.variables && remove.mutate(remove.variables) }
        : null

  return (
    <section aria-labelledby="friends-title" className="app-page">
      <PageMeta title="Friends" description="Your friends on Matchpoynt: players, club members and club owners you've added, and requests to answer." />
      <div>
        <h1 id="friends-title" className="font-display text-2xl font-bold">
          Friends
        </h1>
        <p className="text-sm text-muted-foreground">Add the people you play with: players, club members and club owners.</p>
      </div>
      {failed && <ErrorBanner error={failed.error} action={failed.action} onRetry={failed.retry} />}
      <FriendSearchCard actions={actions} />
      {friends.isError ? (
        <ErrorBanner error={friends.error} action="load your friends" onRetry={() => void friends.refetch()} />
      ) : !friends.data ? (
        <FriendsSkeleton />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <FriendRequestsCard incoming={friends.data.incoming} outgoing={friends.data.outgoing} actions={actions} />
          <FriendListCard friends={friends.data.friends} actions={actions} />
        </div>
      )}
    </section>
  )
}
