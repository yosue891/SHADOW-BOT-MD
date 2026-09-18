import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontsDir = path.join(__dirname, '..', 'src', 'fonts')
const LOCAL_AVATAR = path.join(__dirname, 'catalogo.jpg')
const LOCAL_BG = path.join(__dirname, 'welcome-bg.jpg')

let canvasLib = null
let canvasEngine = null // 'napi', 'vendor', 'canvas', or null

async function getCanvas() {
  if (canvasLib) return { lib: canvasLib, engine: canvasEngine }

  // 1. Probar @napi-rs/canvas (binario Rust/Skia precompilado que funciona en cualquier Linux/Alpine/ARM)
  try {
    const mod = await import('@napi-rs/canvas')
    const resolved = mod.default && mod.default.createCanvas ? mod.default : mod
    if (typeof resolved.createCanvas === 'function') {
      canvasLib = resolved
      canvasEngine = 'napi'
      return { lib: canvasLib, engine: canvasEngine }
    }
  } catch {}

  // 2. Probar vendor precompilado en lib/canvas-vendor
  try {
    const vendorUrl = new URL('./canvas-vendor/index.js', import.meta.url).href
    const mod = await import(vendorUrl)
    const resolved = mod.default && mod.default.createCanvas ? mod.default : mod
    if (typeof resolved.createCanvas === 'function') {
      canvasLib = resolved
      canvasEngine = 'vendor'
      return { lib: canvasLib, engine: canvasEngine }
    }
  } catch {}

  // 3. Probar paquete npm 'canvas'
  try {
    const mod = await import('canvas')
    const resolved = mod.default && mod.default.createCanvas ? mod.default : mod
    if (typeof resolved.createCanvas === 'function') {
      canvasLib = resolved
      canvasEngine = 'canvas'
      return { lib: canvasLib, engine: canvasEngine }
    }
  } catch {}

  return null
}

let fontsReady = false
function setupFonts(lib, engine) {
  if (fontsReady || !lib) return
  const bebas = path.join(fontsDir, 'BebasNeue.ttf')
  const bold = path.join(fontsDir, 'MenuBold.ttf')

  try {
    if (lib.GlobalFonts && typeof lib.GlobalFonts.registerFromPath === 'function') {
      if (fs.existsSync(bebas)) lib.GlobalFonts.registerFromPath(bebas, 'BebasNeue')
      if (fs.existsSync(bold)) lib.GlobalFonts.registerFromPath(bold, 'MenuBold')
      fontsReady = true
      return
    }
    if (typeof lib.registerFont === 'function') {
      if (fs.existsSync(bebas)) lib.registerFont(bebas, { family: 'BebasNeue' })
      if (fs.existsSync(bold)) lib.registerFont(bold, { family: 'MenuBold' })
      fontsReady = true
    }
  } catch {}
}

const TITLE_FONT = "'BebasNeue', 'Arial Narrow', sans-serif"
const BODY_FONT = "'MenuBold', 'Arial', sans-serif"

async function fetchBuffer(src) {
  if (!src) throw new Error('No source provided')
  if (Buffer.isBuffer(src)) return src
  if (typeof src === 'string' && fs.existsSync(src)) {
    return fs.readFileSync(src)
  }
  const res = await fetch(src, {
    signal: AbortSignal.timeout(10000),
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

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Motor de respaldo ultra-fiable con Sharp + SVG.
 * Nunca falla porque Sharp ya incluye libvips y librsvg en todas las plataformas.
 */
async function renderCardWithSharp({
  backgroundUrl,
  avatarUrl,
  title = 'BIENVENIDO',
  eyebrow = 'S H A D O W   G A R D E N',
  username = '@user',
  groupName = 'El Grupo',
  footerLine = '',
  accent = '#27E7FF',
  accent2 = '#FF2E93'
}) {
  const W = 1280, H = 640
  const cx = 800, cy = Math.round(H / 2 - 20), r = 118

  let bgBuf = null
  if (backgroundUrl) {
    try { bgBuf = await fetchBuffer(backgroundUrl) } catch {}
  }
  if (!bgBuf && fs.existsSync(LOCAL_BG)) {
    try { bgBuf = fs.readFileSync(LOCAL_BG) } catch {}
  }
  if (!bgBuf && fs.existsSync(LOCAL_AVATAR)) {
    try { bgBuf = fs.readFileSync(LOCAL_AVATAR) } catch {}
  }
  if (!bgBuf) {
    bgBuf = await sharp({
      create: { width: W, height: H, channels: 3, background: { r: 10, g: 10, b: 26 } }
    }).jpeg().toBuffer()
  }

  let avatarBuf = null
  if (avatarUrl) {
    try { avatarBuf = await fetchBuffer(avatarUrl) } catch {}
  }
  if (!avatarBuf && fs.existsSync(LOCAL_AVATAR)) {
    try { avatarBuf = fs.readFileSync(LOCAL_AVATAR) } catch {}
  }

  const composites = []

  if (avatarBuf) {
    try {
      const rightW = W - cx
      const rightBanner = await sharp(avatarBuf)
        .resize(rightW, H, { fit: 'cover' })
        .png()
        .toBuffer()
      composites.push({ input: rightBanner, left: cx, top: 0, blend: 'over' })

      const avatarSize = r * 2
      const mask = Buffer.from(`<svg width="${avatarSize}" height="${avatarSize}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`)
      const circularAvatar = await sharp(avatarBuf)
        .resize(avatarSize, avatarSize, { fit: 'cover' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer()

      // Circular avatar will be pushed at the end so it stays on top
      composites._circularAvatar = { input: circularAvatar, left: cx - r, top: cy - r, blend: 'over' }
    } catch (e) {
      console.warn('[WELCOME SHARP] Error procesando avatar en Sharp:', e.message)
    }
  }

  const safeTitle = escapeXml(String(title).toUpperCase())
  const safeEyebrow = escapeXml(eyebrow)
  const safeUsername = escapeXml(username)
  const safeGroup = escapeXml(groupName)
  const safeFooter = escapeXml(footerLine)

  const svgOverlay = Buffer.from(`
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leftGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#060814" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="#060814" stop-opacity="0.88"/>
          <stop offset="80%" stop-color="#060814" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#060814" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="dividerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${accent}"/>
          <stop offset="50%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="${accent2}"/>
        </linearGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${accent}"/>
          <stop offset="100%" stop-color="${accent2}"/>
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(8, 10, 24, 0.45)" />
      <rect x="0" y="0" width="${cx + 120}" height="${H}" fill="url(#leftGrad)" />
      <rect x="${cx - 1.5}" y="90" width="3" height="${H - 180}" fill="url(#dividerGrad)" />

      ${avatarBuf ? `
        <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="rgba(6, 8, 20, 0.85)" />
        <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${accent}" stroke-width="7" />
        <circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2" />
        <circle cx="${cx}" cy="${cy}" r="${r + 22}" fill="none" stroke="${accent2}" stroke-width="2" stroke-dasharray="26,18" />
      ` : ''}

      <rect x="92" y="134" width="6" height="26" fill="${accent}" />
      <text x="112" y="156" font-family="'DejaVu Sans', Arial, sans-serif" font-size="24" font-weight="bold" fill="rgba(255,255,255,0.92)" letter-spacing="4">${safeEyebrow}</text>

      <text x="92" y="270" font-family="'DejaVu Sans', Arial, sans-serif" font-size="96" font-weight="900" fill="#FFFFFF">${safeTitle}</text>

      <rect x="92" y="316" width="460" height="70" rx="14" ry="14" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="2" />
      <text x="122" y="363" font-family="'DejaVu Sans', Arial, sans-serif" font-size="34" font-weight="bold" fill="#FFFFFF">${safeUsername}</text>

      <text x="92" y="468" font-family="'DejaVu Sans', Arial, sans-serif" font-size="22" font-weight="bold" fill="${accent}">GRUPO</text>
      <text x="92" y="508" font-family="'DejaVu Sans', Arial, sans-serif" font-size="30" font-weight="bold" fill="#FFFFFF">${safeGroup}</text>

      <text x="470" y="468" font-family="'DejaVu Sans', Arial, sans-serif" font-size="22" font-weight="bold" fill="${accent2}">MIEMBROS</text>
      <text x="470" y="508" font-family="'DejaVu Sans', Arial, sans-serif" font-size="30" font-weight="bold" fill="#FFFFFF">${safeFooter}</text>

      <rect x="92" y="${H - 58}" width="420" height="5" fill="url(#barGrad)" />
      <text x="92" y="${H - 32}" font-family="'DejaVu Sans', Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.55)">I am atomic.</text>
    </svg>
  `)

  composites.push({ input: svgOverlay, left: 0, top: 0, blend: 'over' })
  if (composites._circularAvatar) {
    composites.push(composites._circularAvatar)
  }

  return await sharp(bgBuf)
    .resize(W, H, { fit: 'cover' })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer()
}

export async function renderWelcomeCard(opts) {
  const {
    backgroundUrl,
    avatarUrl,
    title = 'BIENVENIDO',
    eyebrow = 'S H A D O W  G A R D E N',
    username = '@usuario',
    groupName = 'el Grupo',
    footerLine = '',
    accent = '#27E7FF',
    accent2 = '#FF2E93'
  } = opts

  // Intentar renderizar con motor Canvas
  try {
    const canvasObj = await getCanvas()
    if (canvasObj && canvasObj.lib) {
      const { lib, engine } = canvasObj
      setupFonts(lib, engine)

      const W = 1280, H = 640
      const canvas = lib.createCanvas(W, H)
      const ctx = canvas.getContext('2d')

      let bgImg = null
      if (backgroundUrl) {
        try { bgImg = await lib.loadImage(await fetchBuffer(backgroundUrl)) } catch {}
      }
      if (!bgImg && fs.existsSync(LOCAL_BG)) {
        try { bgImg = await lib.loadImage(fs.readFileSync(LOCAL_BG)) } catch {}
      }
      if (!bgImg && fs.existsSync(LOCAL_AVATAR)) {
        try { bgImg = await lib.loadImage(fs.readFileSync(LOCAL_AVATAR)) } catch {}
      }

      let avatarImg = null
      if (avatarUrl) {
        try { avatarImg = await lib.loadImage(await fetchBuffer(avatarUrl)) } catch {}
      }
      if (!avatarImg && fs.existsSync(LOCAL_AVATAR)) {
        try { avatarImg = await lib.loadImage(fs.readFileSync(LOCAL_AVATAR)) } catch {}
      }

      if (bgImg) {
        coverDraw(ctx, bgImg, 0, 0, W, H)
      } else {
        const plainGrad = ctx.createLinearGradient(0, 0, W, H)
        plainGrad.addColorStop(0, '#0a0a1a')
        plainGrad.addColorStop(1, '#020205')
        ctx.fillStyle = plainGrad
        ctx.fillRect(0, 0, W, H)
      }

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
      ctx.fillText(String(title).toUpperCase(), tx, 292)
      ctx.restore()

      ctx.font = `50px ${BODY_FONT}`
      const userText = truncateTo(ctx, username, maxTextW)
      const userW = ctx.measureText(userText).width
      const pillY = 322
      const pillH = 74
      const pillW = userW + 56
      const pr = 14
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tx, pillY, pillW, pillH, pr)
      } else {
        ctx.rect(tx, pillY, pillW, pillH)
      }
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
  } catch (canvasErr) {
    console.warn('[WELCOME CARD] Canvas no disponible o falló, usando motor de respaldo Sharp:', canvasErr.message)
  }

  // Motor secundario infalible (Sharp): garantiza tarjeta con avatar y diseño
  return await renderCardWithSharp(opts)
}

export async function renderGoodbyeCard(opts) {
  return renderWelcomeCard({ ...opts, accent: opts.accent || '#FF416C', accent2: opts.accent2 || '#B06BFF' })
}
