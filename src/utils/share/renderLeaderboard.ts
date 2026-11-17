import type { LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
import { leaderboardImage, shareBackgrounds } from '@/config/shareCards'
import { site } from '@/config/site'
import type { ShareCard } from '@/interfaces/ShareCard'
import type { ShareBackground } from '@/types/leaderboard'
import type { ColorToken } from '@/types/theme'
import { color, drawHeader, fonts, imageClub, loadFonts, palette, text, toBlob, type ImageClub, type Palette } from '@/utils/share/draw'

// The whole leaderboard as one image, drawn in the browser: the session's
// name, the top three as medals, then every player's row (rank, played,
// W–L, +/−), in the order the API ranked them.

export interface LeaderboardImageContext {
  /** The session's title, or "<Sport> session". */
  title: string
  sportName: string
  /** Shown small at the bottom, e.g. the public leaderboard's address. */
  footer: string
  background: ShareBackground
  /** The club that runs the session, with its photo at the top; `null` without one. */
  club: LeaderboardClub | null
}

const { width: W, padding: P, headerHeight, podiumHeight, rowHeight, footerHeight, maxRows, medalRadius } = leaderboardImage
const medals: ColorToken[] = ['gold', 'silver', 'bronze']
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

/** The image's background over its full height, with the logo and the club at the top. */
function stage(ctx: CanvasRenderingContext2D, height: number, info: LeaderboardImageContext, club: ImageClub | null, pal: Palette) {
  const colours = shareBackgrounds[info.background].stage
  if (colours) {
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, color(colours[0]))
    bg.addColorStop(1, color(colours[1]))
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, height)
  }
  drawHeader(ctx, { sportName: info.sportName, club }, pal)
  text(ctx, info.footer, W / 2, height - P + 10, { family: fonts.sans, fill: pal.muted, shadow: pal.shadow, weight: 500, size: 28 })
}

/** One of the top three: a medal with the place, the name and the record. */
function medal(ctx: CanvasRenderingContext2D, e: LeaderboardEntry, place: number, x: number, top: number, pal: Palette) {
  const cy = top + medalRadius + (place === 1 ? 0 : 36)
  ctx.save()
  ctx.fillStyle = color(medals[place - 1]!)
  ctx.beginPath()
  ctx.arc(x, cy, place === 1 ? medalRadius * 1.15 : medalRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  text(ctx, String(place), x, cy + 26, { weight: 700, size: place === 1 ? 84 : 72, family: fonts.display, fill: color('medal-foreground') })
  const colWidth = (W - 2 * P) / 3 - 24
  text(ctx, e.name, x, cy + medalRadius + 72, { weight: 700, size: 44, family: fonts.display, fill: pal.ink, shadow: pal.shadow, maxWidth: colWidth })
  text(ctx, `${e.wins}–${e.losses} · ${signed(e.pointsFor - e.pointsAgainst)}`, x, cy + medalRadius + 116, { weight: 500, size: 30, family: fonts.sans, fill: pal.muted, shadow: pal.shadow, maxWidth: colWidth })
}

/** Column positions of the table: rank, player, then figures right-aligned. */
const columns = { rank: P, name: P + 96, played: W - P - 300, record: W - P - 140, diff: W - P }

/**
 * The whole leaderboard as one image: everyone who played, ranked, then
 * those yet to play; the top three as medals; up to `maxRows` rows, with a
 * line for any more.
 */
export async function renderLeaderboardImage(entries: LeaderboardEntry[], info: LeaderboardImageContext): Promise<ShareCard> {
  await loadFonts()
  const ordered = [...entries.filter((e) => e.played > 0), ...entries.filter((e) => e.played === 0)]
  const podium = ordered.filter((e) => e.played > 0).slice(0, 3)
  const rows = ordered.slice(0, maxRows)
  const more = ordered.length - rows.length
  const height = headerHeight + (podium.length ? podiumHeight : 0) + rowHeight * (rows.length + 1) + (more > 0 ? rowHeight : 0) + footerHeight

  const el = document.createElement('canvas')
  el.width = W
  el.height = height
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw images (no canvas support).')
  const pal = palette(info)
  stage(ctx, height, info, await imageClub(info.club), pal)

  text(ctx, info.title, P, P + 190, { weight: 700, size: 88, family: fonts.display, fill: pal.ink, shadow: pal.shadow, align: 'left' })
  text(ctx, `Leaderboard · ${ordered.length} ${ordered.length === 1 ? 'player' : 'players'}`, P, P + 250, { weight: 500, size: 34, family: fonts.sans, fill: pal.muted, shadow: pal.shadow, align: 'left' })

  let y = headerHeight
  if (podium.length) {
    // 2nd · 1st · 3rd, as on the board's podium.
    const third = (W - 2 * P) / 3
    const spots = [podium[1], podium[0], podium[2]]
    spots.forEach((e, i) => {
      if (!e) return
      medal(ctx, e, i === 1 ? 1 : i === 0 ? 2 : 3, P + third * i + third / 2, y, pal)
    })
    y += podiumHeight
  }

  // The table's head, then a row per player on alternating bands.
  const head = { weight: 600, size: 26, family: fonts.sans, fill: pal.muted, shadow: pal.shadow }
  text(ctx, '#', columns.rank, y + 40, { ...head, align: 'left' })
  text(ctx, 'Player', columns.name, y + 40, { ...head, align: 'left' })
  text(ctx, 'Played', columns.played, y + 40, { ...head, align: 'right' })
  text(ctx, 'W–L', columns.record, y + 40, { ...head, align: 'right' })
  text(ctx, '+/−', columns.diff, y + 40, { ...head, align: 'right' })
  y += rowHeight
  rows.forEach((e, i) => {
    if (i % 2 === 0) {
      ctx.save()
      ctx.globalAlpha = 0.07
      ctx.fillStyle = pal.ink
      ctx.beginPath()
      ctx.roundRect(P - 20, y, W - 2 * P + 40, rowHeight - 6, 16)
      ctx.fill()
      ctx.restore()
    }
    const base = y + rowHeight / 2 + 12
    const cell = { weight: 600, size: 34, family: fonts.sans, fill: pal.ink, shadow: pal.shadow }
    text(ctx, e.played > 0 ? String(e.rank) : '–', columns.rank, base, { ...cell, weight: 700, family: fonts.display, align: 'left' })
    text(ctx, e.name, columns.name, base, { ...cell, align: 'left', maxWidth: columns.played - columns.name - 120 })
    text(ctx, String(e.played), columns.played, base, { ...cell, fill: pal.muted, align: 'right' })
    text(ctx, `${e.wins}–${e.losses}`, columns.record, base, { ...cell, align: 'right' })
    text(ctx, signed(e.pointsFor - e.pointsAgainst), columns.diff, base, { ...cell, fill: pal.muted, align: 'right' })
    y += rowHeight
  })
  if (more > 0) text(ctx, `+${more} more on the leaderboard`, W / 2, y + 44, { weight: 500, size: 30, family: fonts.sans, fill: pal.muted, shadow: pal.shadow })

  const slug = info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'session'
  const suffix = info.background === 'black' ? '' : `-${info.background}`
  return { title: 'Leaderboard', fileName: `${site.name.toLowerCase()}-${slug}-leaderboard${suffix}.png`, blob: await toBlob(el) }
}
