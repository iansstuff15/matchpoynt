import type { PublishLinkCopy } from '@/interfaces/PublishLinkCopy'

/** Wording of the publish dialogs. */
export const publishCopy = {
  session: {
    publishLabel: 'Publish session',
    shareLabel: 'Share leaderboard',
    title: 'Session leaderboard link',
    description: "Anyone with this link can see the leaderboard and recent results. They can't change anything.",
    publishAction: 'publish the leaderboard',
    unpublishAction: 'stop sharing the leaderboard',
    openTitle: 'Open the public leaderboard in a new tab',
  },
  tournament: {
    publishLabel: 'Publish tournament',
    shareLabel: 'Share tournament',
    title: 'Tournament link',
    description: "Anyone with this link can follow the live bracket, results and the champion. They can't change anything.",
    publishAction: 'publish the tournament',
    unpublishAction: 'stop sharing the tournament',
    openTitle: 'Open the public tournament page in a new tab',
  },
} satisfies Record<string, PublishLinkCopy>
