import type { SocialPlatform } from '@matchpoynt/shared'
import { Globe } from 'lucide-react'
import { socialIconPaths } from '@/config/socialIcons'
import { cn } from '@/utils/cn'

/** A social platform's logo (or a globe for a website), sized like a lucide icon and coloured by the text around it. */
export default function SocialIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  if (platform === 'website') return <Globe className={cn('size-4', className)} aria-hidden />
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn('size-4 shrink-0', className)} aria-hidden focusable="false">
      <path d={socialIconPaths[platform]} />
    </svg>
  )
}
