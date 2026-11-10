import type { PhotoPosition } from '@matchpoynt/shared'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

interface PositionedPhotoProps extends Omit<ComponentProps<'img'>, 'src'> {
  url: string
  position: PhotoPosition
}

/** A club photo filling its frame, at the point and zoom set in the photo editor (saved by the API). */
export default function PositionedPhoto({ url, position, className, style, alt = '', ...props }: PositionedPhotoProps) {
  const point = `${position.x}% ${position.y}%`
  return (
    <img
      {...props}
      src={url}
      alt={alt}
      draggable={false}
      className={cn('positioned-photo', className)}
      style={{ ...style, objectPosition: point, transformOrigin: point, transform: position.zoom === 1 ? undefined : `scale(${position.zoom})` }}
    />
  )
}
