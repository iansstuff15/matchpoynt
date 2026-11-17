/**
 * Liquid glass (`LiquidGlass`, `.liquid-glass` in index.css): the refraction
 * filter's settings, the defaults of https://liquidglass.archisvaze.com.
 * The tint and shadows are in index.css; the filter is built from these by
 * `utils/glass/liquidGlass.ts` for each surface's exact size.
 */
export const liquidGlass = {
  /** Shape of the glass edge: how its height rises across the bezel. */
  surface: 'convexSquircle',
  /** Glass thickness at the centre, in px. */
  thickness: 80,
  /** Width of the curved rim that bends light, in px (capped by the corner radius). */
  bezel: 60,
  /** Index of refraction: higher bends the page behind more. */
  ior: 3,
  /** Multiplies the strongest displacement. */
  scaleRatio: 1,
  /** Blur of the page behind before it's bent, in px. */
  blur: 0.3,
  /** Strength of the light caught along the rim. */
  specularOpacity: 0.5,
  /** Saturation of the page seen through the rim's highlight. */
  specularSaturation: 4,
  /** Where the light comes from, in radians (π/3: top left). */
  lightAngle: Math.PI / 3,
  /** Samples across the bezel when tracing the refraction profile. */
  samples: 128,
} as const
