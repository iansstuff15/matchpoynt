import { createContext, useContext } from 'react'

/** Opens "What's new" (the changelog dialog) from anywhere in the app shell. */
export const WhatsNewContext = createContext<{ open: () => void }>({ open: () => {} })

export const useWhatsNew = () => useContext(WhatsNewContext)
