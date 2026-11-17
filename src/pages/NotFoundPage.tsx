import { House } from 'lucide-react'
import { Link } from 'react-router'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { homePath } from '@/utils/platform'

export default function NotFoundPage() {
  return (
    <section className="section container-page">
      <PageMeta title="Page not found" description="This page does not exist on Matchpoynt." />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h1 className="text-display font-bold">Out of bounds</h1>
          </EmptyTitle>
          <EmptyDescription>The page you were looking for isn't on this court.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to={homePath()}>
              <House />
              Back to home
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}
