import type { Context } from 'hono'
import { invalid } from '@/utils/http/errors'

/** Photo upload endpoints (replaced with PUT): the only requests allowed a body larger than a JSON change, with adding a payment QR code (POST). */
const uploadPaths = /^\/api\/(clubs\/[^/]+\/(avatar|cover|plans\/[^/]+\/cover|badges\/[^/]+\/icon)|profile\/avatar)$/
const addedUploads = /^\/api\/clubs\/[^/]+\/payment-qrs$/

export const isImageUpload = (method: string, path: string) => (method === 'PUT' && uploadPaths.test(path)) || (method === 'POST' && addedUploads.test(path))

/** The `image` file from a multipart upload, as bytes. */
export async function uploadedImage(c: Context): Promise<Uint8Array> {
  const form = await c.req.parseBody().catch(() => {
    throw invalid('The upload was not a valid form. Choose the photo again.')
  })
  const file = form['image']
  if (!(file instanceof File)) throw invalid('Choose a photo to upload.', { image: 'No file' })
  return new Uint8Array(await file.arrayBuffer())
}
