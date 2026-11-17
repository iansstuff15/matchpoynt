import { handleRules } from '@matchpoynt/shared'

/** A handle to start from, made from the name ("Riverside Smashers" → "riversidesmashers"). The API checks it. */
export const handleFromName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, handleRules.maxLength)
