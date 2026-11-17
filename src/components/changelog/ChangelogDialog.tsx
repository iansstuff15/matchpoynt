import { Sparkles, Tag } from 'lucide-react'
import { useState } from 'react'
import ChangelogText from '@/components/changelog/ChangelogText'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { latestRelease, releases } from '@/config/changelog'

const longDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * "What's new": CHANGELOG.md, one release at a time, with the releases in a
 * sidebar (newest first, the latest marked). Opens on the newest release.
 */
export default function ChangelogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [version, setVersion] = useState(latestRelease?.version ?? '')
  const release = releases.find((r) => r.version === version) ?? latestRelease
  if (!release) return null
  const steps = releases.map((r) => ({ id: r.version, label: `v${r.version}`, icon: Tag }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="size-5" aria-hidden />
            What's new
          </DialogTitle>
          <DialogDescription>Every Matchpoynt release, newest first.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[10rem_1fr]">
          <SetupStepNav label="Releases" steps={steps} current={release.version} errors={{}} onSelect={setVersion} />
          <section aria-labelledby="release-title" className="min-h-0 overflow-y-auto pr-1">
            <h3 id="release-title" className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
              Version {release.version}
              {release === latestRelease && <Badge>Latest</Badge>}
            </h3>
            {release.date && <p className="text-sm text-muted-foreground">Released {longDate(release.date)}</p>}
            {release.summary && (
              <p className="mt-3 text-sm">
                <ChangelogText text={release.summary} />
              </p>
            )}
            {release.sections.map((section) => (
              <div key={section.title} className="mt-5">
                <h4 className="font-display font-semibold">{section.title}</h4>
                <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground" aria-label={`${section.title} in ${release.version}`}>
                  {section.items.map((item) => (
                    <li key={item}>
                      <ChangelogText text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            <Sparkles />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
