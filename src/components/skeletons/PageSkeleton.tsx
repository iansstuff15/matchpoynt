import { Skeleton } from '@/components/ui/skeleton'

/** A standard content page (eyebrow, title, lead, body block) like Rankings or Sign in. */
export default function PageSkeleton() {
  return (
    <div className="section container-page space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-96 max-w-full" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <Skeleton className="mt-10 h-9 w-full max-w-2xl rounded-lg" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
