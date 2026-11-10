import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** "All clubs", above a club's manager page. */
export default function BackToClubs() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/clubs">
        <ArrowLeft />
        All clubs
      </Link>
    </Button>
  )
}
