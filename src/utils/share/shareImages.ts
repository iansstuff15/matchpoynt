import type { ShareCard } from '@/interfaces/ShareCard'

// Handing images to the device: the share sheet where the browser can share
// files (mostly phones), downloads everywhere else.

const asFiles = (cards: ShareCard[]) => cards.map((c) => new File([c.blob], c.fileName, { type: c.blob.type }))

/** Whether this browser can put image files on the share sheet. */
export function canShareImages(cards: ShareCard[]): boolean {
  return typeof navigator.canShare === 'function' && cards.length > 0 && navigator.canShare({ files: asFiles(cards) })
}

/** Opens the share sheet with the images. Resolves `false` if the person closed it without sharing. */
export async function shareImages(cards: ShareCard[], title: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ files: asFiles(cards), title, text })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}

/** Saves an image through a temporary link. */
export function downloadImage(card: ShareCard): void {
  const url = URL.createObjectURL(card.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = card.fileName
  link.click()
  // Give the download a moment to start before letting go of the image.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
