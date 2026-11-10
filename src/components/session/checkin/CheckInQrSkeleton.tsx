import { Skeleton } from '@/components/ui/skeleton'

/** Same layout as the QR dialog body: the square code, the progress line and the link field. */
export default function CheckInQrSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Making the check-in QR code">
      <Skeleton className="check-in-qr" />
      <div className="grid gap-1.5">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}
