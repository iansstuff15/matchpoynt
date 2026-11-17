import { socialPlatforms, type SocialLink } from '@matchpoynt/shared'
import SocialIcon from '@/components/social/SocialIcon'

/** Social and web links, each with its platform's logo, opening in a new tab, named by kind and site. */
export default function SocialLinksList({ links, label }: { links: SocialLink[]; label: string }) {
  if (!links.length) return <span className="text-muted-foreground">None</span>
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:bg-muted"
            title={link.url}
          >
            <SocialIcon platform={link.platform} className="size-3.5" />
            {socialPlatforms[link.platform].label}
            {link.platform === 'website' && <span className="text-muted-foreground">{new URL(link.url).hostname.replace(/^www\./, '')}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}
