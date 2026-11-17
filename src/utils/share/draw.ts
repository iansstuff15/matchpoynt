import { shareBackgrounds, shareCard } from '@/config/shareCards'
import { theme } from '@/config/theme'
import type { LeaderboardClub } from '@matchpoynt/shared'
import type { ShareCardContext } from '@/interfaces/ShareCard'
import type { ColorToken } from '@/types/theme'

// Drawing helpers shared by every share image (players' cards and the whole
// leaderboard): theme colours, fonts, text that fits, the background's colours.

/** A theme colour as CSS (canvas accepts the tokens' oklch values). */
export const color = (token: ColorToken) => getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() || 'black'

export const fonts = { sans: theme.fonts.sans.stack, display: theme.fonts.display.stack }

/** Waits for the web fonts the cards use, so text isn't drawn in a fallback. */
export async function loadFonts() {
  await Promise.all([
    document.fonts.load(`700 100px ${fonts.display}`),
    document.fonts.load(`600 60px ${fonts.sans}`),
    document.fonts.load(`500 40px ${fonts.sans}`),
  ])
}

/** Sets a font, shrinking it until `text` fits `maxWidth`. */
export function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxWidth: number) {
  let px = size
  do {
    ctx.font = `${weight} ${px}px ${family}`
    px -= 4
  } while (ctx.measureText(text).width > maxWidth && px > 24)
}

export function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, opts: { weight: number; size: number; family: string; fill: string; align?: CanvasTextAlign; maxWidth?: number; shadow?: boolean }) {
  fitFont(ctx, value, opts.weight, opts.size, opts.family, opts.maxWidth ?? ctx.canvas.width - 2 * shareCard.padding)
  ctx.save()
  ctx.fillStyle = opts.fill
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'alphabetic'
  // On a transparent image, a soft shadow keeps light text readable on whatever photo it's laid over.
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = Math.round(opts.size / 5)
    ctx.shadowOffsetY = Math.round(opts.size / 20)
  }
  ctx.fillText(value, x, y)
  ctx.restore()
}

/** The colours of a card's background, resolved from the theme: ink, muted, plate, and whether text gets a shadow. */
export function palette(info: Pick<ShareCardContext, 'background'>) {
  const bg = shareBackgrounds[info.background]
  return { ink: color(bg.ink), muted: color(bg.muted), plate: color(bg.plate), accent: color('logo-accent'), shadow: bg.shadow }
}
export type Palette = ReturnType<typeof palette>


export const toBlob = (el: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => el.toBlob((b) => (b ? resolve(b) : reject(new Error("The image couldn't be created."))), shareCard.type))

/** The logo's two arches (components/brand/LogoMark), in its own coordinates. */
const logo = {
  box: { x: 60, y: 134, width: 392, height: 244 },
  ink: 'M88,350 V270 A108,108 0 0 1 304,270 V350',
  accent: 'M208,350 V270 A108,108 0 0 1 424,270 V350',
  /** Where the accent arch passes over the ink arch, the ink arch is cut away. */
  cut: 'M215,231.8 A108,108 0 0 1 319.3,162.1',
}

/**
 * Draws the Matchpoynt logo `height` px tall with its top-left at (x, y): the
 * ink arch in the text colour, the other in the accent (a club's, when its
 * colours are on). Drawn on its own canvas first, so the cut between the
 * arches never cuts the background. Returns its width.
 */
export function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, pal: Palette): number {
  const scale = height / logo.box.height
  const art = document.createElement('canvas')
  art.width = Math.ceil(logo.box.width * scale)
  art.height = Math.ceil(height)
  const a = art.getContext('2d')
  if (!a) return 0
  a.scale(scale, scale)
  a.translate(-logo.box.x, -logo.box.y)
  a.lineCap = 'round'
  a.lineWidth = 48
  a.strokeStyle = pal.ink
  a.stroke(new Path2D(logo.ink))
  a.globalCompositeOperation = 'destination-out'
  a.lineWidth = 72
  a.stroke(new Path2D(logo.cut))
  a.globalCompositeOperation = 'source-over'
  a.lineWidth = 48
  a.strokeStyle = pal.accent
  a.stroke(new Path2D(logo.accent))
  ctx.save()
  if (pal.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = Math.round(height / 4)
  }
  ctx.drawImage(art, x, y)
  ctx.restore()
  return art.width
}

/** Loads an image from this site (club photos are same-origin, so the canvas stays exportable); `null` if it won't load. */
export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
    return image
  } catch {
    return null
  }
}

/** The club on an image: its photo, or its initials on a plate when it has none. */
export interface ImageClub extends LeaderboardClub {
  image: HTMLImageElement | null
}

/** Loads the club's photo, ready to draw. */
export async function imageClub(club: LeaderboardClub | null): Promise<ImageClub | null> {
  if (!club) return null
  return { ...club, image: club.avatarUrl ? await loadImage(club.avatarUrl) : null }
}

/** A round club photo centred on (x, y), covering the circle; the club's initials on a plate without one. */
export function drawClubPhoto(ctx: CanvasRenderingContext2D, club: ImageClub, x: number, y: number, radius: number, pal: Palette) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2)
  ctx.fillStyle = pal.accent
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = pal.plate
  ctx.fill()
  if (club.image) {
    ctx.clip()
    const scale = Math.max((2 * radius) / club.image.naturalWidth, (2 * radius) / club.image.naturalHeight)
    const w = club.image.naturalWidth * scale
    const h = club.image.naturalHeight * scale
    ctx.drawImage(club.image, x - w / 2, y - h / 2, w, h)
    ctx.restore()
    return
  }
  ctx.restore()
  const initials = club.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  text(ctx, initials, x, y + radius * 0.35, { weight: 700, size: Math.round(radius), family: fonts.display, fill: color('medal-foreground'), maxWidth: radius * 1.6 })
}

/**
 * The top of every image: the Matchpoynt logo at the left; at the right the
 * club's photo with its name and the sport, or just the sport without a club.
 */
export function drawHeader(ctx: CanvasRenderingContext2D, info: { sportName: string; club: ImageClub | null }, pal: Palette) {
  const W = ctx.canvas.width
  const P = shareCard.padding
  drawLogo(ctx, P, P - 6, 48, pal)
  const small = { family: fonts.sans, fill: pal.muted, shadow: pal.shadow, align: 'right' as const }
  if (!info.club) {
    text(ctx, info.sportName, W - P, P + 30, { ...small, weight: 500, size: 34, maxWidth: W / 2 - P })
    return
  }
  const r = 34
  drawClubPhoto(ctx, info.club, W - P - r, P + 18, r, pal)
  const right = W - P - 2 * r - 20
  text(ctx, info.club.name, right, P + 14, { ...small, weight: 600, size: 32, fill: pal.ink, maxWidth: W / 2 - P })
  text(ctx, info.sportName, right, P + 50, { ...small, weight: 500, size: 26, maxWidth: W / 2 - P })
}
