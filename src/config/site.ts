import { version } from '../../package.json'
import type { SiteConfig } from '@/interfaces/SiteConfig'

export const site: SiteConfig = {
  name: 'Matchpoynt',
  tagline: 'Fair queues. Full courts. Every sport.',
  description:
    'Matchpoynt runs club nights and open play for badminton, pickleball, tennis, padel, table tennis and volleyball: fair player queueing, court assignment, scores, fees and rankings.',
  url: 'https://matchpoynt.com',
  version,
  titleSeparator: ' · ',
  sessionKeys: { splashSeen: 'matchpoynt:splash-seen' },
}
