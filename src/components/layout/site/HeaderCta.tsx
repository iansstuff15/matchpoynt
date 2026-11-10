import { LayoutGrid, LogIn } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/** The header's highlighted action: sign in when signed out, otherwise straight to the board. */
export default function HeaderCta({ className }: { className?: string }) {
  const { web } = useFeatures()
  const me = useMe()
  const signedOut = web.signIn && me.isSuccess && !me.data.user

  return signedOut ? (
    <Button asChild size="sm" className={`rounded-full ${className ?? ''}`}>
      <Link to="/sign-in" title="Sign in to Matchpoynt">
        <LogIn />
        Sign in
      </Link>
    </Button>
  ) : (
    <Button asChild size="sm" className={`rounded-full ${className ?? ''}`}>
      <Link to="/app" title="Open the session board">
        <LayoutGrid />
        Open board
      </Link>
    </Button>
  )
}
