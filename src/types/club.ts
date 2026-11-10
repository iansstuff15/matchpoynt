import type { clubTabs } from '@/config/club'

/** A tab of a club's manager page (`/clubs/<id>?tab=…`). */
export type ClubTab = (typeof clubTabs)[number]
