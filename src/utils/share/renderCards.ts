import type { ClubBadgeView, LeaderboardBadgeId, LeaderboardEntry } from '@matchpoynt/shared'
import { badgeArt } from '@/config/badgeArt'
import { leaderboardBadges } from '@/config/leaderboard'
import { badgeLine, shareBackgrounds, shareCard } from '@/config/shareCards'
import { color, drawHeader, fonts, imageClub, loadFonts, palette, text, toBlob, type ImageClub, type Palette } from '@/utils/share/draw'
import { site } from '@/config/site'
import type { BadgeShape } from '@/interfaces/BadgeArt'
import type { ShareCard, ShareCardContext } from '@/interfaces/ShareCard'
import type { ColorToken } from '@/types/theme'

// Draws shareable images of a player's leaderboard achievements on a canvas:
// a summary card, then one card per badge the API gave them, on a black,
// white or transparent background (`shareBackgrounds`). Colours are the
// theme's tokens and the badge drawings are the same shapes as the icons.

const { width: W, height: H, padding: P } = shareCard

/** What each card is drawn with: the context, and the club's photo once loaded. */
type CardInfo = ShareCardContext & { clubArt: ImageClub | null }

function canvas() {
  const el = document.createElement('canvas')
  el.width = W
  el.height = H
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw images (no canvas support).')
  return { el, ctx }
}

/** Draws a badge's shapes (24×24 grid) centred on (x, y) at `size` px, on its light plate. */
function drawBadge(ctx: CanvasRenderingContext2D, shapes: BadgeShape[], x: number, y: number, size: number, tint: string, plate: string) {
  ctx.save()
  ctx.fillStyle = plate
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

/** The card's background (dark stage, white, or none for a transparent image), with the logo and the club at the top. */
function stage(ctx: CanvasRenderingContext2D, info: ShareCardContext & { clubArt: ImageClub | null }, pal: Palette) {
  const colours = shareBackgrounds[info.background].stage
  if (colours) {
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, color(colours[0]))
    bg.addColorStop(1, color(colours[1]))
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
  }
  drawHeader(ctx, { sportName: info.sportName, club: info.clubArt }, pal)
  text(ctx, info.footer, W / 2, H - P + 10, { family: fonts.sans, fill: pal.muted, shadow: pal.shadow, weight: 500, size: 30 })
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

const record = (e: LeaderboardEntry) => `#${e.rank} · ${e.wins}–${e.losses}`

/** One badge: its drawing on a glow, its name, what earned it, and the player. */
async function badgeCard(e: LeaderboardEntry, badge: LeaderboardBadgeId, info: CardInfo): Promise<Blob> {
  const { el, ctx } = canvas()
  const { label, color: tone } = leaderboardBadges[badge]
  const tint = color(tone)
  const pal = palette(info)
  stage(ctx, info, pal)
  const cy = H * 0.38
  glow(ctx, W / 2, cy, shareCard.glowRadius, tint)
  drawBadge(ctx, badgeArt[badge], W / 2, cy, shareCard.iconSize, tint, pal.plate)
  const title = badge === 'hot-streak' ? `${label} · ${e.streak}` : label
  text(ctx, title, W / 2, H * 0.67, { weight: 700, size: 112, family: fonts.display, fill: pal.ink, shadow: pal.shadow })
  text(ctx, badgeLine[badge](e, info), W / 2, H * 0.67 + 84, { weight: 600, size: 50, family: fonts.sans, fill: pal.muted, shadow: pal.shadow })
  text(ctx, e.name, W / 2, H * 0.84, { weight: 700, size: 72, family: fonts.display, fill: pal.ink, shadow: pal.shadow })
  text(ctx, record(e), W / 2, H * 0.84 + 64, { weight: 500, size: 40, family: fonts.sans, fill: pal.muted, shadow: pal.shadow })
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
async function clubBadgeCard(e: LeaderboardEntry, badge: ClubBadgeView, info: CardInfo): Promise<Blob> {
  const { el, ctx } = canvas()
  const pal = palette(info)
  stage(ctx, info, pal)
  const cy = H * 0.36
  const r = shareCard.iconSize / 2
  const tint = color('primary')
  glow(ctx, W / 2, cy, shareCard.glowRadius, tint)
  ctx.save()
  ctx.fillStyle = pal.plate
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
  text(ctx, badge.name, W / 2, H * 0.67, { weight: 700, size: 112, family: fonts.display, fill: pal.ink, shadow: pal.shadow, maxWidth: W - 2 * P })
  text(ctx, badge.summary, W / 2, H * 0.67 + 84, { weight: 600, size: 44, family: fonts.sans, fill: pal.muted, shadow: pal.shadow, maxWidth: W - 2 * P })
  text(ctx, e.name, W / 2, H * 0.84, { weight: 700, size: 72, family: fonts.display, fill: pal.ink, shadow: pal.shadow })
  text(ctx, record(e), W / 2, H * 0.84 + 64, { weight: 500, size: 40, family: fonts.sans, fill: pal.muted, shadow: pal.shadow })
  return toBlob(el)
}

const placeColor: Record<number, ColorToken> = { 1: 'gold', 2: 'silver', 3: 'bronze' }

/** The player's card: their place, record, points and every badge they hold. */
async function summaryCard(e: LeaderboardEntry, info: CardInfo): Promise<Blob> {
  const { el, ctx } = canvas()
  const pal = palette(info)
  stage(ctx, info, pal)
  const place = placeColor[e.rank] ? color(placeColor[e.rank]!) : pal.ink
  glow(ctx, W / 2, H * 0.3, shareCard.glowRadius, place)
  text(ctx, `#${e.rank}`, W / 2, H * 0.36, { weight: 700, size: 300, family: fonts.display, fill: place, shadow: pal.shadow })
  text(ctx, e.name, W / 2, H * 0.5, { weight: 700, size: 96, family: fonts.display, fill: pal.ink, shadow: pal.shadow })

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
    text(ctx, value, x, H * 0.62, { weight: 700, size: 84, family: fonts.display, fill: pal.ink, shadow: pal.shadow, maxWidth: col - 16 })
    text(ctx, label, x, H * 0.62 + 50, { weight: 500, size: 32, family: fonts.sans, fill: pal.muted, shadow: pal.shadow, maxWidth: col - 16 })
  })

  const badges = e.badges
  if (badges.length) {
    const size = shareCard.miniIconSize
    const gap = 72
    const total = badges.length * size + (badges.length - 1) * gap
    badges.forEach((b, i) => {
      const x = (W - total) / 2 + i * (size + gap) + size / 2
      drawBadge(ctx, badgeArt[b], x, H * 0.79, size, color(leaderboardBadges[b].color), pal.plate)
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
export async function renderPlayerCards(e: LeaderboardEntry, context: ShareCardContext): Promise<ShareCard[]> {
  await loadFonts()
  // The club's photo is loaded once, for every card.
  const info: CardInfo = { ...context, clubArt: await imageClub(context.club) }
  // Each background gets its own file names, so a white and a black set can be saved side by side.
  const base = `${site.name.toLowerCase()}-${slug(e.name)}${info.background === 'black' ? '' : `-${info.background}`}`
  const cards: ShareCard[] = [{ title: 'Summary', fileName: `${base}.png`, blob: await summaryCard(e, info) }]
  for (const b of e.badges) {
    cards.push({ title: leaderboardBadges[b].label, fileName: `${base}-${b}.png`, blob: await badgeCard(e, b, info) })
  }
  for (const b of info.clubBadges) {
    cards.push({ title: b.name, fileName: `${base}-${slug(b.name)}.png`, blob: await clubBadgeCard(e, b, info) })
  }
  return cards
}
