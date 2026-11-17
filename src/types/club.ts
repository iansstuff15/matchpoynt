import type { clubPages, clubSettingsGroups } from '@/config/club'

/** One of a club's pages: its dashboard (`/clubs/<id>`) or `/clubs/<id>/<page>`. */
export type ClubPage = (typeof clubPages)[number]

/** A group of the club settings dialog. */
export type ClubSettingsGroup = (typeof clubSettingsGroups)[number]
