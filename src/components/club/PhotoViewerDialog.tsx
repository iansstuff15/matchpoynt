import { Pencil, ZoomIn, ZoomOut, Scan } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { photoZoom } from '@/config/club'

interface PhotoViewerDialogProps {
  open: boolean
  url: string
  /** e.g. "Riverside Smash Club cover photo". */
  alt: string
  title: string
  onOpenChange: (open: boolean) => void
  /** Opens the dialog to change or remove the photo. */
  onEdit: () => void
}

const clamp = (zoom: number) => Math.min(photoZoom.max, Math.max(photoZoom.min, zoom))

/** A photo, full size, with zoom (buttons or the mouse wheel) and an Edit button. */
export default function PhotoViewerDialog({ open, url, alt, title, onOpenChange, onEdit }: PhotoViewerDialogProps) {
  const [zoom, setZoom] = useState<number>(photoZoom.min)
  const by = (steps: number) => setZoom((z) => clamp(z + steps * photoZoom.step))
  // React's wheel listeners are passive, so the wheel would scroll the page too: listen natively.
  const stage = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      setZoom((z) => clamp(z + (e.deltaY < 0 ? 1 : -1) * photoZoom.step))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setZoom(photoZoom.min)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>Zoom with the buttons or the mouse wheel; scroll to look around.</DialogDescription>
        </DialogHeader>
        <div ref={stage} className="photo-viewer-stage">
          <img src={url} alt={alt} className="photo-viewer-image" style={{ width: `${zoom * 100}%` }} draggable={false} />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex items-center gap-1" role="group" aria-label="Zoom">
            <Button type="button" variant="outline" size="icon" onClick={() => by(-1)} disabled={zoom <= photoZoom.min} aria-label="Zoom out">
              <ZoomOut />
            </Button>
            <span className="w-14 text-center text-sm tabular-nums" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <Button type="button" variant="outline" size="icon" onClick={() => by(1)} disabled={zoom >= photoZoom.max} aria-label="Zoom in">
              <ZoomIn />
            </Button>
            <Button type="button" variant="ghost" onClick={() => setZoom(photoZoom.min)} disabled={zoom === photoZoom.min}>
              <Scan />
              Fit
            </Button>
          </div>
          <Button type="button" onClick={onEdit}>
            <Pencil />
            Edit photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
