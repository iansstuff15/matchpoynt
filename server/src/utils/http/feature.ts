import type { Features } from '@matchpoynt/shared'
import type { MiddlewareHandler } from 'hono'
import { features } from '@/config/features'
import { notFound } from '@/utils/http/errors'

/** Answers 404 when a feature is switched off, so a hidden button is never the only guard. */
export function requireFeature<G extends keyof Features>(group: G, key: keyof Features[G]): MiddlewareHandler {
  return async (_c, next) => {
    if (!features()[group][key]) throw notFound('Not found.')
    await next()
  }
}
