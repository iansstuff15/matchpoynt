import { describe, expect, it } from 'vitest'
import { checkBadgeIcon, checkImage, isMediaPath, mediaPath, sniffImage } from '@/utils/club/media'

const owner = '3f2b8c1e-9a4d-4c7b-8e21-5d6f7a8b9c0d'
const club = '0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4'
const id = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)])

describe('sniffImage', () => {
  it('reads the real type from the first bytes', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    expect(sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
  })

  it('rejects anything else, whatever it is called', () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull()
  })
})

describe('checkImage', () => {
  it('names the problem', () => {
    expect(() => checkImage(new Uint8Array())).toThrow('Choose a photo')
    expect(() => checkImage(new Uint8Array(6 * 1024 * 1024))).toThrow('up to 4 MB')
    expect(() => checkImage(bytes(1, 2, 3))).toThrow('JPEG, PNG or WebP')
  })
})

describe('media paths', () => {
  it('builds names under the owner folder that the media route accepts', () => {
    const path = mediaPath(owner, club, 'cover', id)
    expect(path).toBe(`${owner}/${club}/cover-${id}.webp`)
    expect(isMediaPath(path)).toBe(true)
  })

  it('refuses anything else', () => {
    for (const bad of [`${owner}/${club}/../secret.jpg`, `${owner}/${club}/cover-${id}.svg`, `${owner}/cover-${id}.jpg`, `x/${club}/cover-${id}.jpg`]) {
      expect(isMediaPath(bad)).toBe(false)
    }
  })
})

describe('badge icons', () => {
  const gif89 = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0)

  it('recognises GIFs, but never as club photos', () => {
    expect(sniffImage(gif89)).toBe('image/gif')
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))).toBe('image/gif')
    expect(() => checkImage(gif89)).toThrow('Photos must be JPEG, PNG or WebP images.')
  })

  it('accepts GIFs and images as badge icons, and names what is wrong otherwise', () => {
    expect(checkBadgeIcon(gif89)).toBe('image/gif')
    expect(checkBadgeIcon(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(() => checkBadgeIcon(new Uint8Array())).toThrow('Choose an image or GIF for the badge.')
    expect(() => checkBadgeIcon(new TextEncoder().encode('not an image'))).toThrow('Badge icons must be GIF, JPEG, PNG or WebP images.')
  })

  it('stores badge icons under their own name, GIFs as .gif', () => {
    const owner = '11111111-1111-4111-8111-111111111111'
    const club = '22222222-2222-4222-8222-222222222222'
    const id = '33333333-3333-4333-8333-333333333333'
    const path = mediaPath(owner, club, 'badge', id, 'image/gif')
    expect(path).toBe(`${owner}/${club}/badge-${id}.gif`)
    expect(isMediaPath(path)).toBe(true)
  })
})
