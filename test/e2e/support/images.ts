import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { crc32, deflateSync } from 'node:zlib'
import encodeJpeg, { init as initJpegEncode } from '@jsquash/jpeg/encode.js'

/** A file for `setInputFiles`. */
export interface TestFile {
  name: string
  mimeType: string
  buffer: Buffer
}

/** A real PNG of one colour, `width` × `height`, built by hand (no image library needed). */
export function png(width: number, height: number, [r, g, b]: [number, number, number] = [240, 90, 40]): TestFile {
  const chunk = (type: string, data: Buffer) => {
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const out = Buffer.alloc(8 + data.length + 4)
    out.writeUInt32BE(data.length, 0)
    typed.copy(out, 4)
    out.writeUInt32BE(crc32(typed), 8 + data.length)
    return out
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8-bit RGB, no interlace
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())])
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))
  const buffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))])
  return { name: 'club-photo.png', mimeType: 'image/png', buffer }
}

let jpegReady: Promise<void> | undefined
const require = createRequire(import.meta.url)
const wasm = (globalThis as unknown as { WebAssembly: { compile: (b: Uint8Array) => Promise<Parameters<typeof initJpegEncode>[0]> } }).WebAssembly

/** A real JPEG, encoded with the same codec family the API decodes with. */
export async function jpeg(width: number, height: number): Promise<TestFile> {
  jpegReady ??= readFile(require.resolve('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm')).then(async (b) => initJpegEncode(await wasm.compile(b)))
  await jpegReady
  const data = new Uint8ClampedArray(width * height * 4).fill(200)
  const bytes = await encodeJpeg({ data, width, height, colorSpace: 'srgb' } as Parameters<typeof encodeJpeg>[0])
  return { name: 'cover.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(bytes) }
}

/** Text dressed up as a PNG: the name and type say image, the bytes don't. */
export const notAnImage = (): TestFile => ({ name: 'holiday.png', mimeType: 'image/png', buffer: Buffer.from('this is not a photo') })

/** A real (tiny) GIF, as a badge icon upload. */
export function gif(): TestFile {
  const bytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, 255, 120, 0, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0, 0x3b]
  return { name: 'medal.gif', mimeType: 'image/gif', buffer: Buffer.from(bytes) }
}
