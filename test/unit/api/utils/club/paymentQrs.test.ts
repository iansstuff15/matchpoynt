import { describe, expect, it } from 'vitest'
import { cleanPosition } from '@/utils/club/appearance'
import { addQrBlockedReason, cleanQrLabel, paymentQrsOf, uploadedQrPosition } from '@/utils/club/paymentQrs'

describe('payment QR codes', () => {
  it('names each one, trimmed, and refuses a missing or long name', () => {
    expect(cleanQrLabel('  GCash   Main ')).toBe('GCash Main')
    expect(() => cleanQrLabel('  ')).toThrow('Name the QR code, e.g. GCash or the bank.')
    expect(() => cleanQrLabel('x'.repeat(31))).toThrow('Keep the name to 30 characters.')
  })

  it('allows up to four, and reads what was stored', () => {
    expect(addQrBlockedReason(3)).toBeNull()
    expect(addQrBlockedReason(4)).toBe('A club can have up to 4 payment QR codes. Remove one to add another.')
    expect(paymentQrsOf([{ id: 'a', label: 'GCash', path: 'p' }, { id: 1 }, null])).toEqual([{ id: 'a', label: 'GCash', path: 'p' }])
    expect(paymentQrsOf(null)).toEqual([])
  })

  it('takes the framing sent with an upload, checked like a photo, centred when left out', () => {
    expect(uploadedQrPosition('{"x":40,"y":60,"zoom":1.5}', cleanPosition)).toEqual({ x: 40, y: 60, zoom: 1.5 })
    expect(uploadedQrPosition(undefined, cleanPosition)).toEqual({ x: 50, y: 50, zoom: 1 })
    expect(() => uploadedQrPosition('{"x":"left"}', cleanPosition)).toThrow('The QR code framing was not valid.')
    expect(() => uploadedQrPosition('not json', cleanPosition)).toThrow('The QR code framing was not valid.')
  })
})
