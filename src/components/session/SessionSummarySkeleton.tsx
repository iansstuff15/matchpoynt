import { Skeleton } from '@/components/ui/skeleton'

/** Settings badges under the title while the session loads. */
export default function SessionSummarySkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {['w-24', 'w-32', 'w-36', 'w-24'].map((w, i) => (
        <Skeleton key={i} className={`h-[22px] ${w} rounded-md`} />
      ))}
    </div>
  )
}
