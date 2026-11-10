import type { ClubBadgeView, LeaderboardBadgeId, LeaderboardEntry } from '@matchpoynt/shared'
import { badgeArt } from '@/config/badgeArt'
import { leaderboardBadges } from '@/config/leaderboard'
import { badgeLine, shareCard } from '@/config/shareCards'
import { site } from '@/config/site'
import { theme } from '@/config/theme'
import type { BadgeShape } from '@/interfaces/BadgeArt'
import type { ShareCard, ShareCardContext } from '@/interfaces/ShareCard'
import type { ColorToken } from '@/types/theme'

// Draws shareable images of a player's leaderboard achievements on a canvas:
// a summary card, then one card per badge the API gave them. Colours are the
// theme's tokens and the badge drawings are the same shapes as the icons.

const { width: W, height: H, padding: P } = shareCard

/** A theme colour as CSS (canvas accepts the tokens' oklch values). */
const color = (token: ColorToken) => getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() || 'black'

const fonts = { sans: theme.fonts.sans.stack, display: theme.fonts.display.stack }

/** Waits for the web fonts the cards use, so text isn't drawn in a fallback. */
async function loadFonts() {
  await Promise.all([
    document.fonts.load(`700 100px ${fonts.display}`),
    document.fonts.load(`600 60px ${fonts.sans}`),
    document.fonts.load(`500 40px ${fonts.sans}`),
  ])
}

function canvas() {
  const el = document.createElement('canvas')
  el.width = W
  el.height = H
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw images (no canvas support).')
  return { el, ctx }
}

/** Sets a font, shrinking it until `text` fits `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxWidth: number) {
  let px = size
  do {
    ctx.font = `${weight} ${px}px ${family}`
    px -= 4
  } while (ctx.measureText(text).width > maxWidth && px > 24)
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, opts: { weight: number; size: number; family: string; fill: string; align?: CanvasTextAlign; maxWidth?: number }) {
  fitFont(ctx, value, opts.weight, opts.size, opts.family, opts.maxWidth ?? W - 2 * P)
  ctx.fillStyle = opts.fill
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(value, x, y)
}

/** Draws a badge's shapes (24×24 grid) centred on (x, y) at `size` px, on its light plate. */
function drawBadge(ctx: CanvasRenderingContext2D, shapes: BadgeShape[], x: number, y: number, size: number, tint: string) {
  ctx.save()
  ctx.fillStyle = color('deep-foreground')
  ctx.beginPath()
  ctx.arc(x, y, size * shareCard.plate, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // The drawing fits inside the plate.
  size *= 0.8
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(size / 24, size / 24)
  for (const s of shapes) {
    const path = new Path2D(s.d)
    if (s.ember || s.fill !== undefined) {
      ctx.globalAlpha = s.ember ? 1 : s.fill!
      ctx.fillStyle = s.ember ? color('ember') : tint
      ctx.fill(path)
    }
    if (s.stroke) {
      ctx.globalAlpha = s.stroke.opacity ?? 1
      ctx.strokeStyle = tint
      ctx.lineWidth = s.stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(path)
    }
  }
  ctx.restore()
}

/** The deep court-green stage every card is drawn on, with the brand at the top. */
function stage(ctx: CanvasRenderingContext2D, info: ShareCardContext) {
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, color('deep'))
  bg.addColorStop(1, color('deep-strong'))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  text(ctx, site.name.toUpperCase(), P, P + 30, { weight: 600, size: 34, family: fonts.sans, fill: color('deep-muted'), align: 'left' })
  text(ctx, info.sportName, W - P, P + 30, { weight: 500, size: 34, family: fonts.sans, fill: color('deep-muted'), align: 'right', maxWidth: W / 2 - P })
  text(ctx, info.footer, W / 2, H - P + 10, { weight: 500, size: 30, family: fonts.sans, fill: color('deep-muted') })
}

/** A soft round glow in a colour, behind a drawing. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tint: string) {
  ctx.save()
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, tint)
  g.addColorStop(1, 'transparent')
  ctx.globalAlpha = 0.28
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const toBlob = (el: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => el.toBlob((b) => (b ? resolve(b) : reject(new Error("The image couldn't be created."))), shareCard.type))

const record = (e: LeaderboardEntry) => `#${e.rank} · ${e.wins}–${e.losses}`

/** One badge: its drawing on a glow, its name, what earned it, and the player. */
async function badgeCard(e: LeaderboardEntry, badge: LeaderboardBadgeId, info: ShareCardContext): Promise<Blob> {
  const { el, ctx } = canvas()
  const { label, color: tone } = leaderboardBadges[badge]
  const tint = color(tone)
  stage(ctx, info)
  const cy = H * 0.38
  glow(ctx, W / 2, cy, shareCard.glowRadius, tint)
  drawBadge(ctx, badgeArt[badge], W / 2, cy, shareCard.iconSize, tint)
  const title = badge === 'hot-streak' ? `${label} · ${e.streak}` : label
  text(ctx, title, W / 2, H * 0.67, { weight: 700, size: 112, family: fonts.display, fill: color('deep-foreground') })
  text(ctx, badgeLine[badge](e, info), W / 2, H * 0.67 + 84, { weight: 600, size: 50, family: fonts.sans, fill: color('deep-muted') })
  text(ctx, e.name, W / 2, H * 0.84, { weight: 700, size: 72, family: fonts.display, fill: color('deep-foreground') })
  text(ctx, record(e), W / 2, H * 0.84 + 64, { weight: 500, size: 40, family: fonts.sans, fill: color('deep-muted') })
  return toBlob(el)
}

/** Loads a club badge's icon (same-origin, so the canvas stays exportable); a GIF draws its first frame. */
async function loadIcon(url: string): Promise<HTMLImageElement | null> {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
    return image
  } catch {
    return null
  }
}

/** One club badge: its icon on a light plate, its name, its conditions, and the player. */
async function clubBadgeCard(e: LeaderboardEntry, badge: ClubBadgeView, info: ShareCardContext): Promise<Blob> {
  const { el, ctx } = canvas()
  stage(ctx, info)
  const cy = H * 0.36
  const r = shareCard.iconSize / 2
  const tint = color('primary')
  glow(ctx, W / 2, cy, shareCard.glowRadius, tint)
  ctx.save()
  ctx.fillStyle = color('card')
  ctx.beginPath()
  ctx.arc(W / 2, cy, r + 18, 0, Math.PI * 2)
  ctx.fill()
  const icon = badge.iconUrl ? await loadIcon(badge.iconUrl) : null
  if (icon) {
    ctx.beginPath()
    ctx.arc(W / 2, cy, r, 0, Math.PI * 2)
    ctx.clip()
    // Cover the circle, cropping the longer side.
    const scale = Math.max((2 * r) / icon.naturalWidth, (2 * r) / icon.naturalHeight)
    const w = icon.naturalWidth * scale
    const h = icon.naturalHeight * scale
    ctx.drawImage(icon, W / 2 - w / 2, cy - h / 2, w, h)
  } else {
    text(ctx, badge.name.slice(0, 1).toUpperCase(), W / 2, cy + 60, { weight: 700, size: 180, family: fonts.display, fill: tint })
  }
  ctx.restore()
  text(ctx, badge.name, W / 2, H * 0.67, { weight: 700, size: 112, family: fonts.display, fill: color('deep-foreground'), maxWidth: W - 2 * P })
  text(ctx, badge.summary, W / 2, H * 0.67 + 84, { weight: 600, size: 44, family: fonts.sans, fill: color('deep-muted'), maxWidth: W - 2 * P })
  text(ctx, e.name, W / 2, H * 0.84, { weight: 700, size: 72, family: fonts.display, fill: color('deep-foreground') })
  text(ctx, record(e), W / 2, H * 0.84 + 64, { weight: 500, size: 40, family: fonts.sans, fill: color('deep-muted') })
  return toBlob(el)
}

const placeColor: Record<number, ColorToken> = { 1: 'gold', 2: 'silver', 3: 'bronze' }

/** The player's card: their place, record, points and every badge they hold. */
async function summaryCard(e: LeaderboardEntry, info: ShareCardContext): Promise<Blob> {
  const { el, ctx } = canvas()
  stage(ctx, info)
  const place = color(placeColor[e.rank] ?? 'deep-foreground')
  glow(ctx, W / 2, H * 0.3, shareCard.glowRadius, place)
  text(ctx, `#${e.rank}`, W / 2, H * 0.36, { weight: 700, size: 300, family: fonts.display, fill: place })
  text(ctx, e.name, W / 2, H * 0.5, { weight: 700, size: 96, family: fonts.display, fill: color('deep-foreground') })

  const diff = e.pointsFor - e.pointsAgainst
  const stats = [
    [String(e.wins), 'Wins'],
    [String(e.losses), 'Losses'],
    [String(e.played), 'Played'],
    [diff > 0 ? `+${diff}` : String(diff), `${info.scoreUnit}s +/−`],
  ] as const
  const col = (W - 2 * P) / stats.length
  stats.forEach(([value, label], i) => {
    const x = P + col * i + col / 2
    text(ctx, value, x, H * 0.62, { weight: 700, size: 84, family: fonts.display, fill: color('deep-foreground'), maxWidth: col - 16 })
    text(ctx, label, x, H * 0.62 + 50, { weight: 500, size: 32, family: fonts.sans, fill: color('deep-muted'), maxWidth: col - 16 })
  })

  const badges = e.badges
  if (badges.length) {
    const size = shareCard.miniIconSize
    const gap = 72
    const total = badges.length * size + (badges.length - 1) * gap
    badges.forEach((b, i) => {
      const x = (W - total) / 2 + i * (size + gap) + size / 2
      drawBadge(ctx, badgeArt[b], x, H * 0.79, size, color(leaderboardBadges[b].color))
    })
  }
  return toBlob(el)
}

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'player'

/** Every card for a player: the summary first, then one per badge the API gave them, built-in then the club's own. */
export async function renderPlayerCards(e: LeaderboardEntry, info: ShareCardContext): Promise<ShareCard[]> {
  await loadFonts()
  const base = `${site.name.toLowerCase()}-${slug(e.name)}`
  const cards: ShareCard[] = [{ title: 'Summary', fileName: `${base}.png`, blob: await summaryCard(e, info) }]
  for (const b of e.badges) {
    cards.push({ title: leaderboardBadges[b].label, fileName: `${base}-${b}.png`, blob: await badgeCard(e, b, info) })
  }
  for (const b of info.clubBadges) {
    cards.push({ title: b.name, fileName: `${base}-${slug(b.name)}.png`, blob: await clubBadgeCard(e, b, info) })
  }
  return cards
}
