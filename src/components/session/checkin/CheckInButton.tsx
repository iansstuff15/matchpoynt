import type { CheckInStatus } from '@matchpoynt/shared'
import { Check, Copy, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import CheckInQrSkeleton from '@/components/session/checkin/CheckInQrSkeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { board } from '@/config/board'

interface CheckInButtonProps {
  checkIn: CheckInStatus
  /** Making the link the first time the QR is opened. */
  pending: boolean
  error: unknown
  onOpen: () => void
}

/**
 * The check-in QR, kept behind a button so it isn't on screen all session.
 * Players scan it with their phone, pick their name and are checked in;
 * only checked-in players are matched.
 */
export default function CheckInButton({ checkIn, pending, error, onOpen }: CheckInButtonProps) {
  const linkId = useId()
  const [copied, setCopied] = useState(false)
  const { url } = checkIn

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the link stays selectable in the field.
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && !url && onOpen()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode />
          Check-in QR
          <span className="text-muted-foreground tabular-nums">
            {checkIn.checkedIn}/{checkIn.total}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Scan to check in</DialogTitle>
          <DialogDescription>
            Players scan this with their phone camera and tap their name. Only checked-in players are matched onto courts.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="grid gap-4">
            <figure className="check-in-qr">
              <QRCodeSVG value={url} size={board.checkInQrSize} marginSize={2} title="Check-in QR code" className="size-full" />
            </figure>
            <div className="grid gap-1.5" aria-live="polite">
              <p className="flex justify-between text-sm">
                <span className="font-medium">Checked in</span>
                <span className="text-muted-foreground tabular-nums">
                  {checkIn.checkedIn} of {checkIn.total}
                </span>
              </p>
              <Progress value={checkIn.total ? (checkIn.checkedIn / checkIn.total) * 100 : 0} aria-label="Players checked in" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={linkId}>Or share the link</Label>
              <div className="flex gap-2">
                <Input id={linkId} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="secondary" onClick={copy} aria-label="Copy check-in link">
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        ) : pending || !error ? (
          <CheckInQrSkeleton />
        ) : null}

        {Boolean(error) && <ErrorBanner error={error} action="make the check-in QR code" onRetry={onOpen} />}
      </DialogContent>
    </Dialog>
  )
}
