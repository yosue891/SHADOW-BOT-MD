import { createCanvas, loadImage, registerFont } from 'canvas'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontsDir = path.join(__dirname, '..', 'src', 'fonts')

let fontsReady = false
function setupFonts() {
  if (fontsReady) return
  const bebas = path.join(fontsDir, 'BebasNeue.ttf')
  const bold = path.join(fontsDir, 'MenuBold.ttf')
  try { if (fs.existsSync(bebas)) registerFont(bebas, { family: 'BebasNeue' }) } catch {}
  try { if (fs.existsSync(bold)) registerFont(bold, { family: 'MenuBold' }) } catch {}
  fontsReady = true
}

const TITLE_FONT = "'BebasNeue', 'Arial Narrow', sans-serif"
const BODY_FONT = "'MenuBold', 'Arial', sans-serif"
const LOCAL_AVATAR = path.join(__dirname, 'catalogo.jpg')

async function fetchBuffer(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' }
  })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function coverDraw(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function truncateTo(ctx, text, maxW) {
  let t = String(text)
  if (ctx.measureText(t).width <= maxW) return t
  while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

function drawSpacedText(ctx, text, x, y, spacing) {
  const chars = String(text).split('')
  let total = 0
  const widths = chars.map(ch => {
    const w = ctx.measureText(ch).width
    total += w + spacing
    return w
  })
  total -= spacing
  let cx = x - total / 2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y)
    cx += widths[i] + spacing
  })
  ctx.textAlign = prevAlign
}

export async function renderWelcomeCard({
  backgroundUrl,
  avatarUrl,
  title,
  eyebrow = 'S H A D O W  G A R D E N',
  username,
  groupName,
  footerLine,
  accent = '#27E7FF',
  accent2 = '#FF2E93'
}) {
  setupFonts()
  const W = 1280, H = 640
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  const bgImg = await loadImage(await fetchBuffer(backgroundUrl))
  let avatarImg = null
  try { avatarImg = await loadImage(await fetchBuffer(avatarUrl)) } catch {}
  if (!avatarImg && fs.existsSync(LOCAL_AVATAR)) {
    try { avatarImg = await loadImage(fs.readFileSync(LOCAL_AVATAR)) } catch {}
  }

  coverDraw(ctx, bgImg, 0, 0, W, H)

  const dim = ctx.createLinearGradient(0, 0, 0, H)
  dim.addColorStop(0, 'rgba(8, 10, 24, 0.25)')
  dim.addColorStop(1, 'rgba(8, 10, 24, 0.55)')
  ctx.fillStyle = dim
  ctx.fillRect(0, 0, W, H)

  const divideX = 800

  if (avatarImg) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(divideX, 0, W - divideX, H)
    ctx.clip()
    coverDraw(ctx, avatarImg, divideX, 0, W - divideX, H)
    ctx.restore()
  }

  const left = ctx.createLinearGradient(0, 0, divideX + 120, 0)
  left.addColorStop(0, 'rgba(6, 8, 20, 0.94)')
  left.addColorStop(0.55, 'rgba(6, 8, 20, 0.88)')
  left.addColorStop(0.8, 'rgba(6, 8, 20, 0.45)')
  left.addColorStop(1, 'rgba(6, 8, 20, 0)')
  ctx.fillStyle = left
  ctx.fillRect(0, 0, divideX + 120, H)

  if (avatarImg) {
    const fade = ctx.createLinearGradient(divideX, 0, W, 0)
    fade.addColorStop(0, 'rgba(6, 8, 20, 0.25)')
    fade.addColorStop(0.25, 'rgba(6, 8, 20, 0.05)')
    fade.addColorStop(1, 'rgba(6, 8, 20, 0.18)')
    ctx.fillStyle = fade
    ctx.fillRect(divideX, 0, W - divideX, H)
  }

  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 24
  const dividerGrad = ctx.createLinearGradient(0, 90, 0, H - 90)
  dividerGrad.addColorStop(0, accent)
  dividerGrad.addColorStop(0.5, '#FFFFFF')
  dividerGrad.addColorStop(1, accent2)
  ctx.fillStyle = dividerGrad
  ctx.fillRect(divideX - 1.5, 90, 3, H - 180)
  ctx.restore()

  const cx = divideX, cy = H / 2 - 20, r = 118
  if (avatarImg) {
    ctx.save()
    ctx.shadowColor = accent
    ctx.shadowBlur = 45
    ctx.beginPath()
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(6, 8, 20, 0.85)'
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    coverDraw(ctx, avatarImg, cx - r, cy - r, r * 2, r * 2)
    ctx.restore()

    ctx.save()
    ctx.shadowColor = accent
    ctx.shadowBlur = 30
    ctx.strokeStyle = accent
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = accent2
    ctx.lineWidth = 2
    ctx.setLineDash([26, 18])
    ctx.beginPath()
    ctx.arc(cx, cy, r + 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  const tx = 92
  const maxTextW = divideX - tx - 120

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 18
  ctx.fillStyle = accent
  ctx.fillRect(tx, 134, 6, 26)
  ctx.restore()

  ctx.font = `28px ${BODY_FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(eyebrow, tx + 20, 158)

  const accentGrad = ctx.createLinearGradient(tx, 0, tx + maxTextW, 0)
  accentGrad.addColorStop(0, '#FFFFFF')
  accentGrad.addColorStop(0.55, '#FFFFFF')
  accentGrad.addColorStop(1, accent)

  let titleSize = 150
  ctx.font = `${titleSize}px ${TITLE_FONT}`
  while (titleSize > 60 && ctx.measureText(title).width > maxTextW) {
    titleSize -= 6
    ctx.font = `${titleSize}px ${TITLE_FONT}`
  }
  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 34
  ctx.fillStyle = accentGrad
  ctx.fillText(title.toUpperCase(), tx, 292)
  ctx.restore()

  ctx.font = `50px ${BODY_FONT}`
  const userText = truncateTo(ctx, username, maxTextW)
  const userW = ctx.measureText(userText).width
  const pillY = 322
  const pillH = 74
  const pillW = userW + 56
  const pr = 14
  ctx.beginPath()
  ctx.roundRect(tx, pillY, pillW, pillH, pr)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(userText, tx + 28, pillY + pillH - 22)

  const cellAX = tx
  const cellBX = tx + 380
  const cellW = 350
  const labelY = 478
  const valueY = 524

  ctx.font = `30px ${BODY_FONT}`
  ctx.fillStyle = accent
  ctx.fillText('GRUPO', cellAX, labelY)
  ctx.font = `36px ${BODY_FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText(truncateTo(ctx, String(groupName), cellW), cellAX, valueY)

  ctx.font = `30px ${BODY_FONT}`
  ctx.fillStyle = accent2
  ctx.fillText('MIEMBROS', cellBX, labelY)
  ctx.font = `34px ${BODY_FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText(truncateTo(ctx, String(footerLine), 290), cellBX, valueY)

  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 20
  const barGrad = ctx.createLinearGradient(tx, 0, tx + 420, 0)
  barGrad.addColorStop(0, accent)
  barGrad.addColorStop(1, accent2)
  ctx.fillStyle = barGrad
  ctx.fillRect(tx, H - 58, 420, 5)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `22px ${BODY_FONT}`
  ctx.fillText('I am atomic.', tx, H - 32)

  return canvas.toBuffer('image/jpeg', { quality: 0.92 })
}

export async function renderGoodbyeCard(opts) {
  return renderWelcomeCard({ ...opts, accent: opts.accent || '#FF416C', accent2: opts.accent2 || '#B06BFF' })
}
