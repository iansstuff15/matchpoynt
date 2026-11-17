import { describe, expect, it } from 'vitest'
import { isImageUpload } from '@/utils/http/upload'

describe('isImageUpload', () => {
  it('gives photo uploads, and adding a payment QR code, room for a photo', () => {
    expect(isImageUpload('PUT', '/api/clubs/c1/avatar')).toBe(true)
    expect(isImageUpload('PUT', '/api/profile/avatar')).toBe(true)
    expect(isImageUpload('POST', '/api/clubs/c1/payment-qrs')).toBe(true)
  })

  it('keeps everything else small', () => {
    expect(isImageUpload('POST', '/api/clubs/c1/avatar')).toBe(false)
    expect(isImageUpload('PUT', '/api/clubs/c1/payment-qrs/q1/position')).toBe(false)
    expect(isImageUpload('POST', '/api/clubs/c1/members')).toBe(false)
  })
})
