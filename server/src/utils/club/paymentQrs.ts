import { paymentQrLimits, type PaymentQrView, type PhotoPosition } from '@matchpoynt/shared'
import { positionOf } from '@/utils/club/appearance'
import { mediaUrl } from '@/utils/club/media'
import { invalid } from '@/utils/http/errors'

// The club's payment QR codes: what players scan to pay (an e-wallet, a bank).
// Stored on the club as [{ id, label, path }]; the images are in club-media.

export interface StoredPaymentQr {
  id: string
  label: string
  path: string
  /** Its framing, as photos have; codes from before framing are centred. */
  position?: PhotoPosition
}

/** The club's QR codes as stored, tidied (anything malformed dropped). */
export function paymentQrsOf(raw: unknown): StoredPaymentQr[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((q): q is StoredPaymentQr => Boolean(q) && typeof q.id === 'string' && typeof q.label === 'string' && typeof q.path === 'string')
}

/** As players and the owner see them: the label and where the image loads. */
export const paymentQrViews = (qrs: StoredPaymentQr[]): PaymentQrView[] =>
  qrs.flatMap((q) => (mediaUrl(q.path) ? [{ id: q.id, label: q.label, url: mediaUrl(q.path)!, position: positionOf(q.position) }] : []))

/** A label, trimmed; throws `invalid` when it's missing or too long. */
export function cleanQrLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw invalid('Name the QR code, e.g. GCash or the bank.', { label: 'Required' })
  if (trimmed.length > paymentQrLimits.labelMaxLength) throw invalid(`Keep the name to ${paymentQrLimits.labelMaxLength} characters.`, { label: 'Too long' })
  return trimmed
}

/** Why another QR code can't be added, or `null`. */
export function addQrBlockedReason(count: number): string | null {
  return count >= paymentQrLimits.maxQrs ? `A club can have up to ${paymentQrLimits.maxQrs} payment QR codes. Remove one to add another.` : null
}

/** The framing sent with an upload (a JSON form field), checked like a photo's; centred when left out. Throws `invalid` when it isn't one. */
export function uploadedQrPosition(raw: unknown, clean: (p: PhotoPosition) => PhotoPosition): PhotoPosition {
  if (typeof raw !== 'string' || !raw) return positionOf(null)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw invalid('The QR code framing was not valid. Frame it again and upload.', { position: 'Not valid' })
  }
  const p = parsed as Partial<PhotoPosition>
  if (typeof p?.x !== 'number' || typeof p?.y !== 'number' || typeof p?.zoom !== 'number') throw invalid('The QR code framing was not valid. Frame it again and upload.', { position: 'Not valid' })
  return clean({ x: p.x, y: p.y, zoom: p.zoom })
}
