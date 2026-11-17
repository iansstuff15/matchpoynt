/*
 * Liquid glass refraction maps, ported from https://github.com/archisvaze/liquid-glass
 * (index.html: calculateRefractionProfile, generateDisplacementMap, generateSpecularMap).
 *
 * MIT License, Copyright (c) 2026 Archis Vaze
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 * to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
 */
import { liquidGlass } from '@/config/glass'

/** How the glass's height rises across the bezel, from the edge (0) to the flat top (1). */
const surfaces = {
  convexSquircle: (x: number) => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
  convexCircle: (x: number) => Math.sqrt(1 - (1 - x) * (1 - x)),
  concave: (x: number) => 1 - Math.sqrt(1 - (1 - x) * (1 - x)),
} satisfies Record<string, (x: number) => number>

export type GlassSurface = keyof typeof surfaces

/** What the SVG filter needs for one surface size. */
export interface GlassFilter {
  width: number
  height: number
  /** PNG data URL: R and G shift the page behind in x and y. */
  displacement: string
  /** PNG data URL: the light caught along the rim. */
  specular: string
  /** feDisplacementMap scale, in px. */
  scale: number
}

/** Sideways shift of a ray through the bezel at each sample, by Snell's law. */
function refractionProfile(thickness: number, bezel: number, height: (x: number) => number, ior: number, samples: number): Float64Array {
  const eta = 1 / ior
  const refract = (nx: number, ny: number): [number, number] | null => {
    const k = 1 - eta * eta * (1 - ny * ny)
    if (k < 0) return null
    const sq = Math.sqrt(k)
    return [-(eta * ny + sq) * nx, eta - (eta * ny + sq) * ny]
  }
  const profile = new Float64Array(samples)
  for (let i = 0; i < samples; i++) {
    const x = i / samples
    const y = height(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const slope = (height(x + dx) - y) / dx
    const mag = Math.sqrt(slope * slope + 1)
    const ray = refract(-slope / mag, -1 / mag)
    profile[i] = ray ? ray[0] * ((y * bezel + thickness) / ray[1]) : 0
  }
  return profile
}

/**
 * Walks every pixel of the rim (a rounded rectangle of `radius`), calling `paint`
 * with its distance in from the edge, its direction outward and its coverage.
 */
function eachRimPixel(w: number, h: number, radius: number, bezel: number, paint: (index: number, fromSide: number, cos: number, sin: number, cover: number) => void) {
  const rSq = radius * radius
  const r1Sq = (radius + 1) ** 2
  const rBSq = Math.max(radius - bezel, 0) ** 2
  const wB = w - radius * 2
  const hB = h - radius * 2
  for (let y1 = 0; y1 < h; y1++) {
    for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < radius ? x1 - radius : x1 >= w - radius ? x1 - radius - wB : 0
      const y = y1 < radius ? y1 - radius : y1 >= h - radius ? y1 - radius - hB : 0
      const dSq = x * x + y * y
      if (dSq > r1Sq || dSq < rBSq) continue
      const dist = Math.sqrt(dSq)
      const cover = dSq < rSq ? 1 : 1 - (dist - radius) / (Math.sqrt(r1Sq) - radius)
      if (cover <= 0 || dist === 0) continue
      paint((y1 * w + x1) * 4, radius - dist, x / dist, y / dist, cover)
    }
  }
}

function toDataUrl(w: number, h: number, fill: (data: Uint8ClampedArray) => void): string {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const image = ctx.createImageData(w, h)
  fill(image.data)
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/**
 * The displacement and specular maps for a surface of `width` × `height` px with
 * corners of `radius` px. Runs in the browser (canvas); returns null for a surface
 * too small to draw.
 */
export function glassFilter(width: number, height: number, radius: number): GlassFilter | null {
  const w = Math.round(width)
  const h = Math.round(height)
  if (w < 2 || h < 2) return null
  const r = Math.floor(Math.min(radius, w / 2, h / 2))
  const bezel = Math.max(1, Math.min(liquidGlass.bezel, r - 1, Math.min(w, h) / 2 - 1))
  const profile = refractionProfile(liquidGlass.thickness, bezel, surfaces[liquidGlass.surface], liquidGlass.ior, liquidGlass.samples)
  const maxShift = Math.max(...Array.from(profile, Math.abs)) || 1
  const samples = profile.length

  const displacement = toDataUrl(w, h, (d) => {
    // Neutral grey (128, 128) means no shift; only the rim bends the page.
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 128
      d[i + 1] = 128
      d[i + 3] = 255
    }
    eachRimPixel(w, h, r, bezel, (i, fromSide, cos, sin, cover) => {
      const shift = profile[Math.min(((fromSide / bezel) * samples) | 0, samples - 1)] || 0
      d[i] = (128 + ((-cos * shift) / maxShift) * 127 * cover + 0.5) | 0
      d[i + 1] = (128 + ((-sin * shift) / maxShift) * 127 * cover + 0.5) | 0
    })
  })

  const light = [Math.cos(liquidGlass.lightAngle), Math.sin(liquidGlass.lightAngle)]
  const specular = toDataUrl(w, h, (d) => {
    eachRimPixel(w, h, r, bezel * 2.5, (i, fromSide, cos, sin, cover) => {
      const facing = Math.abs(cos * light[0] - sin * light[1])
      const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) ** 2))
      const strength = facing * edge
      const shade = (255 * strength) | 0
      d[i] = shade
      d[i + 1] = shade
      d[i + 2] = shade
      d[i + 3] = (shade * strength * cover) | 0
    })
  })

  return { width: w, height: h, displacement, specular, scale: maxShift * liquidGlass.scaleRatio }
}

/**
 * Only Chromium renders an SVG filter as a backdrop-filter; elsewhere the glass
 * keeps its CSS blur.
 */
export function refractionSupported(): boolean {
  if (typeof navigator === 'undefined') return false
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands
  return !!brands?.some((b) => b.brand === 'Chromium')
}
