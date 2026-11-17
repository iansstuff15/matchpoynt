import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react'
import { liquidGlass } from '@/config/glass'
import { cn } from '@/utils/cn'
import { glassFilter, refractionSupported, type GlassFilter } from '@/utils/glass/liquidGlass'

interface LiquidGlassProps extends HTMLAttributes<HTMLElement> {
  /** The element to render: a plain box or a navigation landmark. */
  as?: 'div' | 'nav'
}

/**
 * A liquid-glass surface (the site header and its tab bar): the page behind is
 * bent along the rim by an SVG displacement filter built for this element's exact
 * size, lit along the edge, then tinted (`.liquid-glass` in index.css). Rebuilt
 * when the element resizes. Browsers that can't use an SVG filter as a
 * backdrop-filter (only Chromium can) keep the CSS frosted blur.
 */
export default function LiquidGlass({ as: Tag = 'div', className, style, children, ...props }: LiquidGlassProps) {
  const ref = useRef<HTMLElement>(null)
  const id = `liquid-glass-${useId().replace(/:/g, '')}`
  const [filter, setFilter] = useState<GlassFilter | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !refractionSupported()) return
    let frame = 0
    const build = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { width, height } = element.getBoundingClientRect()
        // rounded-full computes to a huge radius; glassFilter caps it at half the height.
        const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
        setFilter((current) => (current && current.width === Math.round(width) && current.height === Math.round(height) ? current : glassFilter(width, height, radius)))
      })
    }
    const observer = new ResizeObserver(build)
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={cn('liquid-glass', className)}
      data-refraction={filter ? '' : undefined}
      style={{ ...style, ...(filter ? { '--liquid-glass-filter': `url(#${id})` } : {}) } as CSSProperties}
      {...props}
    >
      {filter && (
        <svg aria-hidden className="liquid-glass-defs" width="0" height="0" colorInterpolationFilters="sRGB">
          <defs>
            <filter id={id} x="0%" y="0%" width="100%" height="100%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={liquidGlass.blur} result="blurred" />
              <feImage href={filter.displacement} x="0" y="0" width={filter.width} height={filter.height} result="displacementMap" />
              <feDisplacementMap in="blurred" in2="displacementMap" scale={filter.scale} xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feColorMatrix in="displaced" type="saturate" values={String(liquidGlass.specularSaturation)} result="displacedSaturated" />
              <feImage href={filter.specular} x="0" y="0" width={filter.width} height={filter.height} result="specularMap" />
              <feComposite in="displacedSaturated" in2="specularMap" operator="in" result="specularMasked" />
              <feComponentTransfer in="specularMap" result="specularFaded">
                <feFuncA type="linear" slope={liquidGlass.specularOpacity} />
              </feComponentTransfer>
              <feBlend in="specularMasked" in2="displaced" mode="normal" result="withSaturation" />
              <feBlend in="specularFaded" in2="withSaturation" mode="normal" />
            </filter>
          </defs>
        </svg>
      )}
      {children}
    </Tag>
  )
}
