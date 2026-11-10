import { Check, Copy, ExternalLink, LoaderCircle, Share2, Unlink } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import type { PublishLinkCopy } from '@/interfaces/PublishLinkCopy'

interface PublishLinkButtonProps {
  copy: PublishLinkCopy
  publicUrl: string | null
  publishing: boolean
  unpublishing: boolean
  error: unknown
  onPublish: () => void
  onUnpublish: () => void
}

/** Publishes something read-only (a leaderboard, a tournament) and shows its link to share with players. */
export default function PublishLinkButton({ copy: text, publicUrl, publishing, unpublishing, error, onPublish, onUnpublish }: PublishLinkButtonProps) {
  const linkId = useId()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the link stays selectable in the field.
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && !publicUrl && onPublish()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 />
          {publicUrl ? text.shareLabel : text.publishLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        {publicUrl ? (
          <div className="grid gap-2">
            <Label htmlFor={linkId}>Public link</Label>
            <div className="flex gap-2">
              <Input id={linkId} readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="secondary" onClick={copy} aria-label="Copy link">
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : publishing ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Publishing…
          </p>
        ) : null}

        {Boolean(error) && (
          <ErrorBanner error={error} action={publicUrl ? text.unpublishAction : text.publishAction} onRetry={publicUrl ? onUnpublish : onPublish} />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {publicUrl ? (
            <>
              <Button type="button" variant="outline" onClick={onUnpublish} disabled={unpublishing}>
                {unpublishing ? <LoaderCircle className="animate-spin" /> : <Unlink />}
                Stop sharing
              </Button>
              <Button asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer" title={text.openTitle}>
                  <ExternalLink />
                  Open link
                </a>
              </Button>
            </>
          ) : (
            !publishing && (
              <Button type="button" onClick={onPublish} className="ml-auto">
                <Share2 />
                {text.publishLabel}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
