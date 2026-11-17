import type { PaymentQrView } from '@matchpoynt/shared'
import PositionedPhoto from '@/components/club/PositionedPhoto'

/** The club's payment QR codes, large enough to scan from the screen, each with its name. */
export default function PaymentQrList({ qrs }: { qrs: PaymentQrView[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label="The club's payment QR codes">
      {qrs.map((qr) => (
        <li key={qr.id} className="grid gap-2 rounded-xl border bg-card p-3 text-center">
          <span className="qr-frame">
            <PositionedPhoto url={qr.url} position={qr.position} alt={`${qr.label} QR code to pay the club`} />
          </span>
          <span className="font-medium">{qr.label}</span>
        </li>
      ))}
    </ul>
  )
}
