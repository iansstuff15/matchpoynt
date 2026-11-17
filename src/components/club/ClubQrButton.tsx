import { Check, Copy, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** The club's QR code: scanning it opens its join page (`/join/<handle>`). Print it or show it at the venue. */
export default function ClubQrButton({ name, handle }: { name: string; handle: string }) {
  const [copied, setCopied] = useState(false)
  const linkId = useId()
  const link = `${window.location.origin}/join/${handle}`
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode />
          Club QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Join {name}</DialogTitle>
          <DialogDescription>Scanning this opens the club's join page, where people sign in (or sign up) and ask to join.</DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-4">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={link} size={220} role="img" aria-label={`QR code for ${link}`} />
          </div>
          <p className="font-display text-lg font-semibold">@{handle}</p>
          <div className="grid w-full gap-1.5">
            <Label htmlFor={linkId}>Join link</Label>
            <div className="flex gap-2">
              <Input id={linkId} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                variant="outline"
                aria-label="Copy the join link"
                onClick={() => {
                  void navigator.clipboard?.writeText(link).then(() => setCopied(true))
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
