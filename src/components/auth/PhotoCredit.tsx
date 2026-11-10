import { Camera } from 'lucide-react'
import type { AuthPhoto } from '@/interfaces/AuthPhoto'

/** The licence credit for an auth page's background photo. */
export default function PhotoCredit({ photo }: { photo: AuthPhoto }) {
  const { author, license, licenseUrl, sourceUrl } = photo.credit
  return (
    <p className="flex items-center gap-1.5 text-xs text-white/80">
      <Camera className="size-3.5" aria-hidden />
      <span>
        Photo:{' '}
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline" title="Photo source on Wikimedia Commons">
          {author}
        </a>
        ,{' '}
        <a href={licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline" title={`${license} licence`}>
          {license}
        </a>
      </span>
    </p>
  )
}
