/** What the dialog calls the thing being shared. */
export interface PublishLinkCopy {
  /** Trigger before publishing, e.g. "Publish session". */
  publishLabel: string
  /** Trigger once published, e.g. "Share leaderboard". */
  shareLabel: string
  title: string
  description: string
  /** Completes "Couldn't …", e.g. "publish the leaderboard". */
  publishAction: string
  unpublishAction: string
  openTitle: string
}
