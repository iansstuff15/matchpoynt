import { defaultFeatures, featureEnvNames, type Features } from '@matchpoynt/shared'

const truthy = new Set(['1', 'true', 'on', 'yes'])
const falsy = new Set(['0', 'false', 'off', 'no'])

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (raw === undefined || raw === '') return fallback
  if (truthy.has(raw)) return true
  if (falsy.has(raw)) return false
  throw new Error(`${name} must be true or false, got "${process.env[name]}".`)
}

let cached: Features | undefined

/** Feature toggles from FEATURE_* variables, falling back to `defaultFeatures`. Read once at startup. */
export function features(): Features {
  if (cached) return cached
  const read = <G extends keyof Features>(group: G) =>
    Object.fromEntries(
      Object.entries(featureEnvNames[group]).map(([key, envName]) => [
        key,
        flag(envName, defaultFeatures[group][key as keyof Features[G]] as boolean),
      ]),
    ) as Features[G]
  cached = { web: read('web'), desktop: read('desktop') }
  return cached
}
