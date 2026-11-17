import type { ProfileRecordView } from '@matchpoynt/shared'
import type { ReactNode } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import RecordPageSkeleton from '@/components/record/RecordPageSkeleton'
import PageMeta from '@/components/seo/PageMeta'
import { useProfileRecord } from '@/utils/hooks/useProfile'

interface RecordShellProps {
  title: string
  description: string
  children: (record: ProfileRecordView) => ReactNode
}

/** One page of Your record: its title (for screen readers; the breadcrumbs show it), the record loaded once for every page, and its skeleton or error. */
export default function RecordShell({ title, description, children }: RecordShellProps) {
  const record = useProfileRecord()
  return (
    <section aria-labelledby="record-title" className="app-page grid gap-4">
      <PageMeta title={title} description={description} />
      <h1 id="record-title" className="sr-only">
        {title}
      </h1>
      {record.isError ? (
        <ErrorBanner error={record.error} action="load your record" onRetry={() => void record.refetch()} />
      ) : record.isPending ? (
        <RecordPageSkeleton />
      ) : (
        children(record.data)
      )}
    </section>
  )
}
