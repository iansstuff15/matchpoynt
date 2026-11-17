import type { ClubThemeInput } from '@matchpoynt/shared'

// The colour pickers' form state. The API checks the colours and works out
// every shade from them.

/** Matchpoynt's own colours: nothing picked. */
export const noColors: ClubThemeInput = { accent: null, sidebar: null, page: null }

export const sameColors = (a: ClubThemeInput, b: ClubThemeInput) => a.accent === b.accent && a.sidebar === b.sidebar && a.page === b.page

/** Just the colours of a preset or saved theme. */
export const colorsOf = ({ accent, sidebar, page }: ClubThemeInput): ClubThemeInput => ({ accent, sidebar, page })
