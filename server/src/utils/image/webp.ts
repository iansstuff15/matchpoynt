import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import decodeJpeg, { init as initJpeg } from '@jsquash/jpeg/decode.js'
import decodePng, { init as initPng } from '@jsquash/png/decode.js'
import decodeWebp, { init as initWebpDecode } from '@jsquash/webp/decode.js'
import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode.js'
import { simd } from 'wasm-feature-detect'
import { images } from '@/config/images'
import { invalid } from '@/utils/http/errors'

// Converts uploaded photos to WebP before they're stored. The codecs are
// WebAssembly (jSquash), so the bundled API needs no native modules: the
// production build copies their .wasm files to dist/wasm (scripts/build-api.mjs).

/** Codec files, by the name the build copies them to and their path in node_modules. */
export const codecFiles = {
  'webp_enc_simd.wasm': '@jsquash/webp/codec/enc/webp_enc_simd.wasm',
  'webp_enc.wasm': '@jsquash/webp/codec/enc/webp_enc.wasm',
  'webp_dec.wasm': '@jsquash/webp/codec/dec/webp_dec.wasm',
  'mozjpeg_dec.wasm': '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  'squoosh_png_bg.wasm': '@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
} as const

type CodecFile = keyof typeof codecFiles

/** Next to the bundle (dist/wasm) in production, from node_modules in development and tests. */
function codecPath(file: CodecFile): string {
  const bundled = fileURLToPath(new URL(`./wasm/${file}`, import.meta.url))
  return existsSync(bundled) ? bundled : createRequire(import.meta.url).resolve(codecFiles[file])
}

// Node has WebAssembly at runtime; the API's TypeScript config has no DOM types, so type the one call used.
const wasm = (globalThis as unknown as { WebAssembly: { compile: (bytes: Uint8Array) => Promise<Parameters<typeof initJpeg>[0]> } }).WebAssembly

const compile = async (file: CodecFile) => wasm.compile(await readFile(codecPath(file)))

let ready: Promise<void> | undefined

/** Loads the codecs once, on the first upload. */
function loadCodecs(): Promise<void> {
  ready ??= (async () => {
    // The encoder picks its SIMD build when the runtime supports it; hand it the matching file.
    const encoder = (await simd()) ? 'webp_enc_simd.wasm' : 'webp_enc.wasm'
    await Promise.all([
      initWebpEncode(await compile(encoder)),
      initWebpDecode(await compile('webp_dec.wasm')),
      initJpeg(await compile('mozjpeg_dec.wasm')),
      initPng(await compile('squoosh_png_bg.wasm')),
    ])
  })().catch((error: unknown) => {
    // Let the next upload try again rather than failing forever.
    ready = undefined
    throw error
  })
  return ready
}

export type SourceType = 'image/jpeg' | 'image/png' | 'image/webp'

/**
 * Re-encodes a checked photo (see `checkImage`) as WebP. JPEGs are turned
 * upright from their EXIF orientation first, because WebP keeps no EXIF;
 * re-encoding also drops other metadata such as GPS location. `lossless`
 * keeps every pixel, for QR codes.
 */
export async function toWebp(bytes: Uint8Array, type: SourceType, options: { lossless?: boolean } = {}): Promise<Uint8Array> {
  await loadCodecs()
  const buffer = bytes.slice().buffer
  let image: Awaited<ReturnType<typeof decodeJpeg>>
  try {
    image =
      type === 'image/jpeg'
        ? await decodeJpeg(buffer, { preserveOrientation: true })
        : type === 'image/png'
          ? await decodePng(buffer)
          : await decodeWebp(buffer)
  } catch {
    throw invalid("That photo couldn't be read. It may be damaged; try saving it again or pick another.", { image: 'Unreadable' })
  }
  if (image.width * image.height > images.maxPixels) {
    const megapixels = Math.round(images.maxPixels / 1_000_000)
    throw invalid(`That photo is too large (over ${megapixels} megapixels). Resize it and try again.`, { image: 'Too many pixels' })
  }
  // Lossless keeps every pixel: a QR code must still scan.
  return new Uint8Array(await encodeWebp(image, options.lossless ? { lossless: 1 } : { quality: images.webpQuality }))
}
