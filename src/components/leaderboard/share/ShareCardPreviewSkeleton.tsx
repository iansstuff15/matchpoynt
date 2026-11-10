import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as ShareCardPreview: the 4:5 image and its download button. */
export default function ShareCardPreviewSkeleton() {
  return (
    <li className="grid gap-2">
      <Skeleton className="share-card-preview" />
      <Skeleton className="h-8 w-full" />
    </li>
  )
}
