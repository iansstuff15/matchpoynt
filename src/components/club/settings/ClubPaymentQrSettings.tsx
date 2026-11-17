import { paymentQrLimits, photoPositions, type ClubSummary } from '@matchpoynt/shared'
import { Crop, QrCode, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import PhotoAligner from '@/components/club/PhotoAligner'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import ConfirmButton from '@/components/common/ConfirmButton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubPaymentQrSettingsProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

/**
 * The QR codes players pay the club with: each named (GCash, the bank…) and
 * framed like the club's photos (drag and zoom in `PhotoAligner`, before
 * uploading and any time after), up to `paymentQrLimits.maxQrs`. Members who
 * still owe for a session see them when it ends and in their session history.
 * Stored lossless, so they scan.
 */
export default function ClubPaymentQrSettings({ club, actions }: ClubPaymentQrSettingsProps) {
  const ids = { label: useId(), file: useId() }
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // The picked image, shown in the aligner before it's uploaded.
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const [inputKey, setInputKey] = useState(0)
  // The QR code whose framing is being adjusted.
  const [framing, setFraming] = useState<string | null>(null)
  const { addPaymentQr, alignPaymentQr, removePaymentQr } = actions
  const full = club.paymentQrs.length >= paymentQrLimits.maxQrs

  const pick = (next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next ? URL.createObjectURL(next) : null
    setPreview(previewRef.current)
    setFile(next)
  }
  useEffect(() => () => void (previewRef.current && URL.revokeObjectURL(previewRef.current)), [])

  const reset = () => {
    setLabel('')
    pick(null)
    setInputKey((k) => k + 1)
  }

  return (
    <div className="grid gap-5">
      {club.paymentQrs.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Payment QR codes">
          {club.paymentQrs.map((qr) => (
            <li key={qr.id} className="grid gap-2 rounded-xl border p-3">
              {framing === qr.id ? (
                <PhotoAligner
                  url={qr.url}
                  label={`${qr.label} QR code`}
                  shape="square"
                  position={qr.position}
                  pending={alignPaymentQr.isPending}
                  error={alignPaymentQr.error}
                  onSave={(position) => alignPaymentQr.mutate({ id: qr.id, label: qr.label, position }, { onSuccess: () => setFraming(null) })}
                />
              ) : (
                <span className="qr-frame">
                  <PositionedPhoto url={qr.url} position={qr.position} alt={`${qr.label} payment QR code`} />
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{qr.label}</span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={framing === qr.id ? `Stop framing the ${qr.label} QR code` : `Adjust the framing of the ${qr.label} QR code`}
                    title={framing === qr.id ? 'Done' : 'Adjust framing'}
                    onClick={() => {
                      alignPaymentQr.reset()
                      setFraming(framing === qr.id ? null : qr.id)
                    }}
                  >
                    {framing === qr.id ? <X /> : <Crop />}
                  </Button>
                  <ConfirmButton
                    iconOnly
                    variant="ghost"
                    label={`Remove the ${qr.label} QR code`}
                    icon={Trash2}
                    title={`Remove the ${qr.label} QR code?`}
                    description="Players won't see it any more. You can add it again later."
                    confirmLabel="Remove"
                    pending={removePaymentQr.isPending && removePaymentQr.variables?.id === qr.id}
                    onConfirm={() => removePaymentQr.mutate({ id: qr.id, label: qr.label })}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <QrCode className="size-4" aria-hidden />
          No QR codes yet. Add the ones players can pay you with.
        </p>
      )}
      {Boolean(removePaymentQr.error) && <ErrorBanner error={removePaymentQr.error} action="remove the QR code" onRetry={() => removePaymentQr.variables && removePaymentQr.mutate(removePaymentQr.variables)} />}
      {full ? (
        <p className="text-sm text-muted-foreground">That's the most a club can have ({paymentQrLimits.maxQrs}). Remove one to add another.</p>
      ) : (
        <section className="grid gap-4 border-t pt-4" aria-label="Add a payment QR code">
          <div className="grid gap-1.5">
            <Label htmlFor={ids.label}>Name</Label>
            <Input id={ids.label} value={label} maxLength={paymentQrLimits.labelMaxLength} placeholder="e.g. GCash, BPI" onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={ids.file}>QR code image</Label>
            <Input key={inputKey} id={ids.file} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </div>
          {/* Frame it like a club photo: drag and zoom so the code fills its square, then upload. */}
          {preview && file && (
            <PhotoAligner
              key={preview}
              url={preview}
              label="New QR code"
              shape="square"
              position={photoPositions.default}
              pending={addPaymentQr.isPending}
              error={addPaymentQr.error}
              save={{ label: 'Upload QR code', icon: Upload, whenUnchanged: true, disabled: !label.trim() }}
              onSave={(position) => addPaymentQr.mutate({ label, file, position }, { onSuccess: reset })}
            />
          )}
          {preview && !label.trim() && <p className="text-xs text-muted-foreground">Name it to upload, e.g. GCash.</p>}
        </section>
      )}
    </div>
  )
}
