import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { useAppInfo } from '@/utils/hooks/useAppInfo'

/** Build version from the desktop runtime, or from config on the web. */
export default function AppVersion() {
  const { info, isLoading } = useAppInfo()

  if (isLoading) return <Skeleton className="h-4 w-24" />

  return (
    <p className="text-xs text-muted-foreground">
      {info ? `${info.name} ${info.version} · ${info.os}` : `${site.name} ${site.version} · web`}
    </p>
  )
}
