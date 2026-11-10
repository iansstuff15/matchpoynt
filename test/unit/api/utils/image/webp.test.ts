import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import encodeJpeg, { init as initJpegEncode } from '@jsquash/jpeg/encode.js'
import encodePng, { init as initPngEncode } from '@jsquash/png/encode.js'
import decodeWebp from '@jsquash/webp/decode.js'
import encodeWebp from '@jsquash/webp/encode.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { sniffImage } from '@/utils/club/media'
import { toWebp } from '@/utils/image/webp'

const require = createRequire(import.meta.url)
const wasm = (globalThis as unknown as { WebAssembly: { compile: (b: Uint8Array) => Promise<Parameters<typeof initJpegEncode>[0]> } }).WebAssembly

/** A solid image, `width` × `height`. */
const picture = (width: number, height: number) =>
  ({ data: new Uint8ClampedArray(width * height * 4).fill(180), width, height, colorSpace: 'srgb' }) as Parameters<typeof encodeWebp>[0]

/** Inserts an EXIF block saying "rotate 90° clockwise" (orientation 6) right after the JPEG's start marker. */
function withOrientation6(jpeg: Uint8Array): Uint8Array {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const length = payload.length + 2
  const app1 = [0xff, 0xe1, length >> 8, length & 0xff, ...payload]
  return new Uint8Array([...jpeg.slice(0, 2), ...app1, ...jpeg.slice(2)])
}

const codec = async (path: string) => wasm.compile(await readFile(require.resolve(path)))

beforeAll(async () => {
  // The encoders below only make test photos.
  await initJpegEncode(await codec('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm'))
  await initPngEncode(await codec('@jsquash/png/codec/pkg/squoosh_png_bg.wasm'))
})

describe('toWebp', () => {
  it('converts PNG, JPEG and WebP uploads to WebP of the same size', async () => {
    const inputs = [
      ['image/png', new Uint8Array(await encodePng(picture(40, 20)))],
      ['image/jpeg', new Uint8Array(await encodeJpeg(picture(40, 20)))],
    ] as const
    for (const [type, bytes] of inputs) {
      const out = await toWebp(bytes, type)
      expect(sniffImage(out)).toBe('image/webp')
      const back = await decodeWebp(out.slice().buffer)
      expect([back.width, back.height]).toEqual([40, 20])
    }
    const webp = await toWebp(new Uint8Array(await encodeWebp(picture(10, 10))), 'image/webp')
    expect(sniffImage(webp)).toBe('image/webp')
  })

  it('turns a phone photo upright from its EXIF orientation', async () => {
    const sideways = withOrientation6(new Uint8Array(await encodeJpeg(picture(64, 32))))
    const back = await decodeWebp((await toWebp(sideways, 'image/jpeg')).slice().buffer)
    expect([back.width, back.height]).toEqual([32, 64])
  })

  it('says when a photo is damaged', async () => {
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
    await expect(toWebp(broken, 'image/jpeg')).rejects.toThrow("couldn't be read")
  })
})
