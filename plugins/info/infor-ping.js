import { createCanvas, loadImage } from '@napi-rs/canvas'
import axios from 'axios'
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

// Precargar la imagen en segundo plano al iniciar
getBackgroundImage().catch(() => {})

function formatUptime(uptimeSeconds) {
  const up = Math.floor(uptimeSeconds)
  const hh = String(Math.floor(up / 3600)).padStart(2, '0')
  const mm = String(Math.floor((up % 3600) / 60)).padStart(2, '0')
  const ss = String(Math.floor(up % 60)).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Limpia y normaliza texto para renderizar en Canvas sin caracteres "tofu" (cuadrados □).
 * Convierte fuentes matemáticas a ASCII y remueve emojis y marcas exóticas que no tienen glifo en Linux.
 */
function cleanForCanvas(str, fallback = 'Shadow Bot') {
  if (!str || typeof str !== 'string') return fallback
  let s = unstyleFancyText(str)
  // Remover rangos de emojis y símbolos exóticos que se convierten en □
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{0E00}-\u{0E7F}\u{1780}-\u{17FF}\u{0F00}-\u{0FFF}\u{10D0}-\u{10FF}\u{2E80}-\u{2FD5}]/gu, '')
  // Mantener solo caracteres alfanuméricos y signos de puntuación estándar
  s = s.replace(/[^\w\s.,!?:;()[\]#/@&_+-]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s || fallback
}

let handler = async (m, { conn, usedPrefix }) => {
  // Enviar reacción de rayo en segundo plano de inmediato
  conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } }).catch(() => {})

  const userId = m.sender || ''
  const userNum = userId.split('@')[0] || 'Desconocido'

  // Obtener nombre seguro sin romper la ejecución
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

  // Nombres limpios para Canvas (sin cuadrados □)
  const canvasUser = cleanForCanvas(rawUserName, 'Usuario').slice(0, 20)
  const canvasDomain = cleanForCanvas(rawBotName, 'Shadow-BOT-MD').slice(0, 22)

  // Velocidad de 1 ms solicitada
  const pingValue = '1 ms'
  const statusLentitud = 'Ultra Rápido 🚀'
  const botStatus = 'ONLINE (Activo)'

  try {
    const width = 1200
    const height = 670
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // 1. Imagen de fondo solicitada
    const bg = await getBackgroundImage()
    ctx.drawImage(bg, 0, 0, width, height)

    // 2. Tinte translúcido suave: permite ver claramente la imagen de fondo
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(5, 2, 14, 0.42)')
    grad.addColorStop(0.5, 'rgba(10, 4, 22, 0.32)')
    grad.addColorStop(1, 'rgba(4, 2, 12, 0.58)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // 3. Marcos decorativos Halloween / Shadow
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.70)'
    ctx.lineWidth = 3
    ctx.strokeRect(22, 22, width - 44, height - 44)

    ctx.strokeStyle = 'rgba(176, 96, 255, 0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(30, 30, width - 60, height - 60)

    // 4. Encabezado limpio (sin emojis que generen □ en canvas)
    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('PONG  •  SHADOW GARDEN', 60, 85)

    ctx.fillStyle = '#b060ff'
    ctx.font = 'bold 15px monospace'
    ctx.fillText('SISTEMA DE RENDIMIENTO EN TIEMPO REAL', 65, 114)

    // 5. Badge ONLINE con círculo nativo en la esquina superior derecha
    ctx.fillStyle = 'rgba(8, 4, 20, 0.60)'
    ctx.strokeStyle = '#00e676'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(width - 250, 52, 190, 46, 14)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#00e676'
    ctx.beginPath()
    ctx.arc(width - 225, 75, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = 'bold 17px monospace'
    ctx.fillText('ONLINE • ACTIVO', width - 208, 81)

    // 6. Panel Izquierdo: PONG & 1 ms (Glassmorphism translúcido)
    ctx.fillStyle = 'rgba(10, 5, 26, 0.48)'
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.60)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(60, 145, 470, 455, 20)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 64px sans-serif'
    ctx.fillText('PONG!', 95, 230)

    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 18px monospace'
    ctx.fillText('VELOCIDAD DEL BOT (LATENCIA)', 95, 270)

    // Número gigante: 1 ms
    ctx.fillStyle = '#ffd54f'
    ctx.font = '900 96px sans-serif'
    ctx.fillText('1', 95, 375)
    ctx.font = 'bold 44px sans-serif'
    ctx.fillStyle = '#b060ff'
    ctx.fillText('ms', 170, 375)

    // Barra de estado de lentitud / velocidad
    ctx.fillStyle = 'rgba(0, 230, 118, 0.22)'
    ctx.strokeStyle = '#00e676'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(95, 410, 400, 48, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#00e676'
    ctx.font = 'bold 19px monospace'
    ctx.fillText('ULTRA RAPIDO (OPTIMO)', 115, 441)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px monospace'
    ctx.fillText('LATENCIA MINIMA ALCANZADA', 95, 505)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText('Potencia: 100% | Respuesta Inmediata', 95, 535)

    // 7. Panel Derecho: Estado del Bot y Métricas (Glassmorphism translúcido)
    ctx.fillStyle = 'rgba(10, 5, 26, 0.48)'
    ctx.strokeStyle = 'rgba(176, 96, 255, 0.60)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(560, 145, 580, 455, 20)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#b060ff'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText('ESTADO DEL SISTEMA', 595, 195)

    const stats = [
      { label: 'ESTADO DEL BOT', val: 'Activo (Online)', color: '#00e676' },
      { label: 'VELOCIDAD / PING', val: pingValue, color: '#ffd54f' },
      { label: 'CALIFICACION', val: 'Ultra Rapido', color: '#00e676' },
      { label: 'UPTIME (VIGILIA)', val: uptimeText, color: '#ffffff' },
      { label: 'USUARIO', val: canvasUser, color: '#b060ff' },
      { label: 'DOMINIO', val: canvasDomain, color: '#f0c040' }
    ]

    stats.forEach((st, idx) => {
      const y = 245 + (idx * 55)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.beginPath()
      ctx.roundRect(595, y - 28, 510, 44, 10)
      ctx.fill()

      ctx.fillStyle = 'rgba(240, 240, 240, 0.85)'
      ctx.font = 'bold 14px monospace'
      ctx.fillText(st.label, 615, y)

      ctx.fillStyle = st.color
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(st.val, 830, y)
    })

    // 8. Pie de página decorativo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.60)'
    ctx.font = '13px monospace'
    ctx.fillText('SHADOW GARDEN INTERFACE  |  VELOCIDAD MAXIMA EN TIEMPO REAL', 60, 638)

    const image = await canvas.encode('jpeg')

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

    const caption =
      `✨ 🎃 ¡𝐏𝐎𝐍𝐆 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍! 🦇 ✨\n\n` +
      `> 🚀 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝: *${pingValue}*\n` +
      `> ⚡ 𝐄𝐬𝐭𝐚𝐝𝐨: *${botStatus}*\n` +
      `> 🏎️ 𝐑𝐞𝐧𝐝𝐢𝐦𝐢𝐞𝐧𝐭𝐨: *${statusLentitud}*\n` +
      `> 🕯️ 𝐔𝐩𝐭𝐢𝐦𝐞: *${uptimeText}*\n` +
      `> 👤 𝐔𝐬𝐮𝐚𝐫𝐢𝐨: *${rawUserName}* (@${userNum})\n` +
      `> 👑 𝐃𝐮𝐞𝐧̃𝐨𝐬: *𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨*\n\n` +
      `*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`

    const footer = `© ${rawBotName} · Pong Shadow Halloween 🎃`

    // Enviar formato Producto (Catálogo) solicitado
    try {
      await conn.sendMessage(
        m.chat,
        {
          product: {
            productImage: image,
            productId: 'shadow-ping-001',
            title: `🎃 PONG • SHADOW GARDEN 🦇`,
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
    } catch (productError) {
      // Fallback a imagen estándar con caption si productMessage no es admitido en el cliente
      await conn.sendMessage(
        m.chat,
        {
          image,
          caption,
          footer,
          mentions: [userId]
        },
        { quoted: fkontak }
      )
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
