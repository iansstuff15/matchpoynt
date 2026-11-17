import type { ClubSummary, SessionSetupInput } from '@matchpoynt/shared'
import ClubAvatar from '@/components/club/ClubAvatar'
import FeeSchemeFields from '@/components/fees/FeeSchemeFields'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCanManageClubs } from '@/utils/hooks/useCanManageClubs'
import { useClubs } from '@/utils/hooks/useClubs'

interface FeesStepProps {
  setup: SessionSetupInput
  onChange: (setup: SessionSetupInput) => void
  /** Only this club's saved fee is offered (planning one of its sessions); every club's otherwise. */
  club?: ClubSummary
}

/** The joining fee: picked here, or copied from a club's saved fee scheme. Players are invoiced when the session ends. */
export default function FeesStep({ setup, onChange, club }: FeesStepProps) {
  const canManageClubs = useCanManageClubs()
  const clubs = useClubs(canManageClubs && !club)
  const offered = (club ? [club] : (clubs.data ?? [])).filter((c) => c.fee)

  return (
    <div className="grid gap-6">
      {(club || canManageClubs) && (club ? offered.length > 0 : clubs.isPending || offered.length > 0) && (
        <section aria-labelledby="club-fees-title" className="grid gap-2">
          <h4 id="club-fees-title" className="text-sm font-medium">
            Use a club's fee
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2" aria-busy={!club && clubs.isPending}>
            {!club && clubs.isPending
              ? Array.from({ length: 2 }, (_, i) => (
                  <li key={i}>
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </li>
                ))
              : offered.map((c) => (
                  <li key={c.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start gap-3 py-2 text-left"
                      aria-label={`Use ${c.name}'s fee: ${c.feeSummary}`}
                      onClick={() => onChange({ ...setup, fee: c.fee })}
                    >
                      <ClubAvatar name={c.name} url={c.avatarUrl} position={c.avatarPosition} className="size-8" />
                      <span className="grid min-w-0">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="truncate text-xs font-normal text-muted-foreground">{c.feeSummary}</span>
                      </span>
                    </Button>
                  </li>
                ))}
          </ul>
        </section>
      )}
      <FeeSchemeFields fee={setup.fee} onChange={(fee) => onChange({ ...setup, fee })} />
    </div>
  )
}
