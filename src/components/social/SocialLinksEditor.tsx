import { socialLimits, socialPlatforms, type SocialLink, type SocialPlatform } from '@matchpoynt/shared'
import { Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SocialIcon from '@/components/social/SocialIcon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SocialLinksEditorProps {
  saved: SocialLink[]
  pending: boolean
  error: unknown
  onSave: (links: SocialLink[]) => void
}

const same = (a: SocialLink[], b: SocialLink[]) => JSON.stringify(a) === JSON.stringify(b)

/** Social and web links, one row each: what kind it is and its address. Form state only; the API checks each link is on its site. */
export default function SocialLinksEditor({ saved, pending, error, onSave }: SocialLinksEditorProps) {
  const [links, setLinks] = useState(saved)
  const [seen, setSeen] = useState(saved)
  // Start over from the saved links whenever they change.
  if (!same(seen, saved)) {
    setSeen(saved)
    setLinks(saved)
  }
  const baseId = useId()
  const set = (i: number, patch: Partial<SocialLink>) => setLinks(links.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(links)
      }}
    >
      {links.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
      <ul className="grid gap-3" aria-label="Links">
        {links.map((link, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor={`${baseId}-kind-${i}`}>Link {i + 1}</Label>
              <Select value={link.platform} onValueChange={(platform) => set(i, { platform: platform as SocialPlatform })}>
                <SelectTrigger id={`${baseId}-kind-${i}`} className="w-full" aria-label={`Link ${i + 1} kind`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(socialPlatforms) as SocialPlatform[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <SocialIcon platform={p} />
                      {socialPlatforms[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              aria-label={`Link ${i + 1} address`}
              value={link.url}
              inputMode="url"
              autoComplete="url"
              placeholder={socialPlatforms[link.platform].hosts[0] ? `${socialPlatforms[link.platform].hosts[0]}/…` : 'https://…'}
              maxLength={socialLimits.urlMaxLength}
              onChange={(e) => set(i, { url: e.target.value })}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks(links.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {Boolean(error) && <ErrorBanner error={error} action="save the links" onRetry={pending ? undefined : () => onSave(links)} />}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" disabled={links.length >= socialLimits.maxLinks} onClick={() => setLinks([...links, { platform: 'instagram', url: '' }])}>
          <Plus />
          Add link
        </Button>
        <Button type="submit" disabled={pending || same(links, saved)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Save links
        </Button>
      </div>
    </form>
  )
}
