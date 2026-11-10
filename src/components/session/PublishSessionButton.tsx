import PublishLinkButton from '@/components/common/PublishLinkButton'
import { publishCopy } from '@/config/publish'

interface PublishSessionButtonProps {
  publicUrl: string | null
  publishing: boolean
  unpublishing: boolean
  error: unknown
  onPublish: () => void
  onUnpublish: () => void
}

/** Publishes the session and shows the read-only leaderboard link to share with players. */
export default function PublishSessionButton(props: PublishSessionButtonProps) {
  return <PublishLinkButton copy={publishCopy.session} {...props} />
}
