import { createCanvas, loadImage } from '@napi-rs/canvas'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { unstyleFancyText } from '../../lib/i18n.js'

const BG_URL = 'https://u.pone.rs/opkaarfr.jpg'
let cachedImage = null
let fetchPromise = null

async function getBackgroundImage() {
  if (cachedImage) return cachedImage
  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const res = await axios.get(BG_URL, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        })
        const img = await loadImage(Buffer.from(res.data))
        cachedImage = img
        return img
      } catch (err) {
        const img = await loadImage(BG_URL)
        cachedImage = img
        return img
      } finally {
        fetchPromise = null
      }
    })()
  }
  return fetchPromise
}

// Precargar la imagen de fondo en segundo plano
getBackgroundImage().catch(() => {})

function formatUptime(uptimeSeconds) {
  const up = Math.floor(uptimeSeconds)
  const hh = String(Math.floor(up / 3600)).padStart(2, '0')
  const mm = String(Math.floor((up % 3600) / 60)).padStart(2, '0')
  const ss = String(Math.floor(up % 60)).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Limpia y normaliza texto para renderizar en Canvas con fuentes DejaVu Sans
 * evitando absolutamente caracteres tofu (cuadros vacíos □).
 * Convierte caracteres matemáticos/versalitas a ASCII y elimina símbolos no renderizables.
 */
function cleanForCanvas(str, fallback = 'Shadow-BOT-MD') {
  if (!str || typeof str !== 'string') return fallback
  let s = unstyleFancyText(str)
  s = s.replace(/[\u{10000}-\u{10FFFF}]/gu, '')
  s = s.replace(/[^\x20-\x7EáéíóúüñÁÉÍÓÚÜÑ]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s || fallback
}

let handler = async (m, { conn, usedPrefix }) => {
  // Reacción instantánea de rayo en segundo plano
  conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } }).catch(() => {})

  const userId = m.sender || ''
  const userNum = userId.split('@')[0] || 'Desconocido'

  // Obtención segura del nombre de usuario
  let rawUserName = m.pushName || ''
  if (!rawUserName) {
    try {
      const res = conn.getName ? conn.getName(userId) : ''
      rawUserName = (res instanceof Promise) ? await res : res
    } catch {
      rawUserName = 'Usuario'
    }
  }
  if (!rawUserName || typeof rawUserName !== 'string') rawUserName = 'Usuario'

  const rawBotName = global.botname || global.author || 'Shadow-BOT-MD'
  const uptimeText = formatUptime(process.uptime())

  // Nombres limpios garantizados sin cuadrados (tofu)
  const canvasUser = cleanForCanvas(rawUserName, 'Usuario').slice(0, 18)
  const canvasDomain = cleanForCanvas(rawBotName, 'Shadow-BOT-MD').slice(0, 20)

  // Métricas de velocidad solicitadas
  const pingValue = '1 ms'
  const statusLentitud = 'Ultra Rápido 🚀'
  const botStatus = 'ONLINE (Activo)'

  try {
    const width = 1200
    const height = 670
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // 1. Dibujar la imagen de fondo completa (URL https://u.pone.rs/opkaarfr.jpg)
    const bg = await getBackgroundImage()
    ctx.drawImage(bg, 0, 0, width, height)

    // 2. Viñeteado suave: permite que la imagen del fondo se aprecie claramente en el centro
    const vignette = ctx.createLinearGradient(0, 0, 0, height)
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.40)')
    vignette.addColorStop(0.2, 'rgba(0, 0, 0, 0.10)')
    vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)')
    vignette.addColorStop(0.75, 'rgba(0, 0, 0, 0.35)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    // 3. Barra Superior HUD Translúcida (Glassmorphism de 75px de alto)
    ctx.fillStyle = 'rgba(10, 6, 24, 0.50)'
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(30, 25, width - 60, 75, 16)
    ctx.fill()
    ctx.stroke()

    // Título superior
    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 30px "DejaVu Sans", sans-serif'
    ctx.fillText('PONG  •  SHADOW GARDEN', 60, 74)

    // Indicador ONLINE a la derecha
    ctx.fillStyle = 'rgba(0, 230, 118, 0.22)'
    ctx.strokeStyle = '#00e676'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(width - 240, 39, 180, 46, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#00e676'
    ctx.beginPath()
    ctx.arc(width - 216, 62, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = 'bold 16px "DejaVu Sans", monospace'
    ctx.fillText('ONLINE • ACTIVO', width - 200, 68)

    // 4. Tarjeta Flotante Izquierda: PONG & 1 ms
    ctx.fillStyle = 'rgba(12, 6, 28, 0.55)'
    ctx.strokeStyle = 'rgba(176, 96, 255, 0.70)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(40, 125, 380, 195, 18)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 48px "DejaVu Sans", sans-serif'
    ctx.fillText('PONG!', 65, 182)

    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 16px "DejaVu Sans", monospace'
    ctx.fillText('VELOCIDAD / LATENCIA', 65, 215)

    // 1 ms
    ctx.fillStyle = '#ffd54f'
    ctx.font = '900 64px "DejaVu Sans", sans-serif'
    ctx.fillText('1', 65, 285)
    ctx.font = 'bold 34px "DejaVu Sans", sans-serif'
    ctx.fillStyle = '#b060ff'
    ctx.fillText('ms', 115, 285)

    ctx.fillStyle = '#00e676'
    ctx.font = 'bold 16px "DejaVu Sans", monospace'
    ctx.fillText('ULTRA RAPIDO (OPTIMO)', 185, 278)

    // 5. Barra Inferior con Métricas del Sistema (Sleek Glass Dock)
    ctx.fillStyle = 'rgba(10, 6, 24, 0.60)'
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(30, height - 175, width - 60, 145, 18)
    ctx.fill()
    ctx.stroke()

    // Cuadrícula de datos del sistema (fuente DejaVu Sans garantizada sin tofu)
    const stats = [
      { label: 'ESTADO', val: 'ONLINE (Activo)', color: '#00e676', x: 60, y: height - 130 },
      { label: 'VELOCIDAD', val: '1 ms', color: '#ffd54f', x: 270, y: height - 130 },
      { label: 'CALIFICACION', val: 'Ultra Rapido', color: '#00e676', x: 460, y: height - 130 },
      { label: 'UPTIME (VIGILIA)', val: uptimeText, color: '#ffffff', x: 700, y: height - 130 },
      { label: 'USUARIO', val: canvasUser, color: '#b060ff', x: 60, y: height - 60 },
      { label: 'DOMINIO', val: canvasDomain, color: '#f0c040', x: 460, y: height - 60 },
      { label: 'SISTEMA', val: 'Shadow Garden Linux', color: '#ffffff', x: 700, y: height - 60 }
    ]

    stats.forEach((st) => {
      ctx.fillStyle = 'rgba(240, 240, 240, 0.78)'
      ctx.font = 'bold 12px "DejaVu Sans", monospace'
      ctx.fillText(st.label, st.x, st.y)

      ctx.fillStyle = st.color
      ctx.font = 'bold 18px "DejaVu Sans", sans-serif'
      ctx.fillText(st.val, st.x, st.y + 24)
    })

    const imageBuffer = await canvas.encode('jpeg')

    // Guardar temporalmente para pasar como { url: ... } tal como en el código de bienvenida
    const tmpDir = path.join(process.cwd(), 'tmp')
    fs.mkdirSync(tmpDir, { recursive: true })
    const pingImgPath = path.join(tmpDir, 'ping-canvas.jpg')
    fs.writeFileSync(pingImgPath, imageBuffer)

    const fkontak = {
      key: {
        participants: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'ShadowPing'
      },
      message: {
        contactMessage: {
          displayName: rawBotName,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${rawBotName}\nORG:${rawBotName};\nTEL;type=CELL;type=VOICE;waid=0:+0\nEND:VCARD`
        }
      }
    }

    // Reacción de calabaza Halloween al finalizar
    conn.sendMessage(m.chat, { react: { text: '🎃', key: m.key } }).catch(() => {})

    const caption = `
✨ 🎃 *¡PONG HALLOWEEN!* 🦇 ✨

> 🚀 *Velocidad:* ${pingValue}
> ⚡ *Estado:* ${botStatus}
> 🏎️ *Rendimiento:* ${statusLentitud}
> 🕯️ *Uptime:* ${uptimeText}
> 👤 *Usuario:* ${canvasUser} (@${userNum})
> 👑 *Dominio:* ${canvasDomain}
> 🗡️ *Dueños:* Yosue (Shadow) & Ado

*જ Shadow Garden Interface 🧪 𖤓*
`.trim()

    const footer = `© ${canvasDomain} · Pong Shadow`

    // Enviar con formato producto interactivo tal como en el código de bienvenida
    try {
      await conn.sendMessage(
        m.chat,
        {
          product: {
            productImage: { url: pingImgPath },
            productId: 'ping-001',
            title: '─ P O N G ─ ⚡',
            currencyCode: 'USD',
            priceAmount1000: '0',
            retailerId: 1677,
            productImageCount: 1
          },

          businessOwnerJid: '0@s.whatsapp.net',

          caption,

          footer,

          interactiveButtons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '⚡ Ping de nuevo',
                id: `${usedPrefix || '.'}ping`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📜 Menú Completo',
                id: `${usedPrefix || '.'}menu`
              })
            }
          ],

          mentions: [userId]
        },
        { quoted: fkontak }
      )
    } catch (errProduct) {
      console.error('Error enviando product con archivo local, intentando URL directa:', errProduct?.message || errProduct)
      // Fallback usando URL directa de la imagen como en el código de bienvenida
      try {
        await conn.sendMessage(
          m.chat,
          {
            product: {
              productImage: { url: BG_URL },
              productId: 'ping-001',
              title: '─ P O N G ─ ⚡',
              currencyCode: 'USD',
              priceAmount1000: '0',
              retailerId: 1677,
              productImageCount: 1
            },

            businessOwnerJid: '0@s.whatsapp.net',

            caption,

            footer,

            interactiveButtons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '⚡ Ping de nuevo',
                  id: `${usedPrefix || '.'}ping`
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '📜 Menú Completo',
                  id: `${usedPrefix || '.'}menu`
                })
              }
            ],

            mentions: [userId]
          },
          { quoted: fkontak }
        )
      } catch (errFallback) {
        console.error('Error enviando product fallback, enviando imagen estándar:', errFallback?.message || errFallback)
        await conn.sendMessage(
          m.chat,
          {
            image: imageBuffer,
            caption,
            footer,
            mentions: [userId]
          },
          { quoted: fkontak }
        )
      }
    }

  } catch (e) {
    console.error('PING CANVAS ERROR:', e)
    await conn.sendMessage(m.chat, {
      text: `❌ Error generando imagen de ping.\n\n${e?.message || e}`
    }, { quoted: m })
  }
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping', 'p']

export default handler
