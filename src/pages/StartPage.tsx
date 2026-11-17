import { Navigate, useNavigate } from 'react-router'
import PageMeta from '@/components/seo/PageMeta'
import ModeChooser from '@/components/start/ModeChooser'
import { chooseAppMode, useAppMode } from '@/utils/hooks/useAppMode'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Where every sign-in lands (`/start`). Players go on to pick a club, Queue
 * Masters to the board; "both" accounts first choose how they're using the app
 * this time (`ModeChooser`, full screen and animated like the club picker).
 */
export default function StartPage() {
  const { web } = useFeatures()
  const me = useMe()
  const { both } = useAppMode()
  const navigate = useNavigate()
  const playerHome = web.clubs && web.clubDirectory ? '/choose-club' : '/profile'

  if (!web.signIn) return <Navigate to="/app" replace />
  if (me.isPending) return <section aria-busy="true" aria-label="Opening Matchpoynt" className="full-screen-page club-picker" />
  if (!both) return <Navigate to={me.data?.user?.role === 'player' ? playerHome : '/app'} replace />

  return (
    <>
      <PageMeta title="Welcome back" description="Choose how you're using Matchpoynt: as a player or as a club owner." />
      <ModeChooser
        onChoose={(mode) => {
          chooseAppMode(mode)
          navigate(mode === 'player' ? playerHome : '/app', { replace: true })
        }}
      />
    </>
  )
}
