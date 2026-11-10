import type { Plugin } from 'vite'
import { motion } from '../../config/motion.ts'
import { theme } from '../../config/theme.ts'
import { themeToCss } from './toCss.ts'

const id = 'virtual:matchpoynt-theme.css'
const resolvedId = `\0${id}`

/** Serves the CSS generated from `config/theme.ts` as `virtual:matchpoynt-theme.css`. */
export function matchpoyntTheme(): Plugin {
  return {
    name: 'matchpoynt-theme',
    resolveId: (source) => (source === id ? resolvedId : undefined),
    load: (source) => (source === resolvedId ? themeToCss(theme, motion) : undefined),
  }
}
