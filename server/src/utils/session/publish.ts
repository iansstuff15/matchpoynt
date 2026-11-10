import { randomBytes } from 'node:crypto'
import { env } from '@/config/env'

/** 22-character URL-safe token (128 bits), so links can't be guessed. */
export function newPublicSlug(): string {
  return randomBytes(16).toString('base64url')
}

export function publicUrl(slug: string | null): string | null {
  return slug ? `${env().APP_URL}/s/${slug}` : null
}

export const isPublicSlug = (value: string) => /^[A-Za-z0-9_-]{22}$/.test(value)
