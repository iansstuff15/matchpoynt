import { Fragment } from 'react'
import { Link } from 'react-router'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'

/** The trail at the top of every app page, on the sidebar-coloured frame: earlier steps dimmed and linked, the page on screen bold, "/" between. */
export default function AppBreadcrumbs() {
  const crumbs = useBreadcrumbs()
  if (crumbs.length === 0) return null

  return (
    <Breadcrumb className="app-breadcrumbs">
      <BreadcrumbList className="gap-2 text-lg font-medium text-sidebar-foreground sm:gap-2.5 sm:text-2xl">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          const label = crumb.label ?? <Skeleton className="inline-block h-5 w-32 bg-sidebar-accent align-middle" />
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className="text-sidebar-foreground/50">/</BreadcrumbSeparator>}
              <BreadcrumbItem>
                {last || !crumb.href ? (
                  <BreadcrumbPage className={last ? 'truncate font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground'}>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="text-sidebar-foreground hover:text-sidebar-accent-foreground">
                    <Link to={crumb.href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
