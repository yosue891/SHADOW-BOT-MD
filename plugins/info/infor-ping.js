import { createCanvas, loadImage } from '@napi-rs/canvas'
import axios from 'axios'

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
        // Fallback cargando directo por URL si axios falla
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

let handler = async (m, { conn }) => {
  // Enviar reacción de inmediato en segundo plano para no demorar el envío
  conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } }).catch(() => {})

  const userId = m.sender || ''
  const userNum = userId.split('@')[0] || 'Desconocido'
  let userName = m.pushName || ''
  if (!userName) {
    try {
      const res = conn.getName ? conn.getName(userId) : ''
      userName = (res instanceof Promise) ? await res : res
    } catch {
      userName = 'Usuario'
    }
  }
  if (!userName || typeof userName !== 'string') userName = 'Usuario'
  const botname = global.botname || global.author || 'Shadow Bot'
  const uptimeText = formatUptime(process.uptime())

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

    // 2. Capa de degradado oscuro Halloween / Shadow Garden para contraste
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(5, 2, 18, 0.78)')
    grad.addColorStop(0.5, 'rgba(10, 4, 26, 0.62)')
    grad.addColorStop(1, 'rgba(4, 2, 14, 0.92)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // 3. Marcos decorativos
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.55)'
    ctx.lineWidth = 3
    ctx.strokeRect(25, 25, width - 50, height - 50)

    ctx.strokeStyle = 'rgba(176, 96, 255, 0.45)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(33, 33, width - 66, height - 66)

    // 4. Encabezado
    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('🎃 PONG • SHADOW GARDEN 🦇', 60, 85)

    ctx.fillStyle = '#b060ff'
    ctx.font = '16px monospace'
    ctx.fillText('INTERFACE DE RENDIMIENTO EN TIEMPO REAL', 65, 115)

    // 5. Badge ONLINE (Esquina superior derecha)
    ctx.fillStyle = 'rgba(15, 10, 35, 0.88)'
    ctx.strokeStyle = '#00e676'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(width - 245, 52, 185, 46, 14)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#00e676'
    ctx.beginPath()
    ctx.arc(width - 222, 75, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = 'bold 18px monospace'
    ctx.fillText('ONLINE • ACTIVO', width - 205, 81)

    // 6. Panel Izquierdo: PONG & Velocidad (1 ms)
    ctx.fillStyle = 'rgba(18, 10, 42, 0.85)'
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(60, 150, 470, 450, 20)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 64px sans-serif'
    ctx.fillText('PONG!', 95, 235)

    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 18px monospace'
    ctx.fillText('VELOCIDAD DEL BOT (LATENCIA)', 95, 275)

    // Número gigante: 1 ms
    ctx.fillStyle = '#ffd54f'
    ctx.font = '900 96px sans-serif'
    ctx.fillText('1', 95, 380)
    ctx.font = 'bold 44px sans-serif'
    ctx.fillStyle = '#b060ff'
    ctx.fillText('ms', 170, 380)

    // Barra de estado de lentitud / velocidad
    ctx.fillStyle = 'rgba(0, 230, 118, 0.16)'
    ctx.strokeStyle = '#00e676'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(95, 415, 400, 48, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#00e676'
    ctx.font = 'bold 20px monospace'
    ctx.fillText('⚡ ULTRA RÁPIDO (ÓPTIMO)', 120, 446)

    ctx.fillStyle = '#ffffff'
    ctx.font = '16px monospace'
    ctx.fillText('LATENCIA MÍNIMA ALCANZADA', 95, 510)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.fillText('Potencia: 100% | Respuestas Inmediatas', 95, 540)

    // 7. Panel Derecho: Estado del Bot y Métricas
    ctx.fillStyle = 'rgba(18, 10, 42, 0.85)'
    ctx.strokeStyle = 'rgba(176, 96, 255, 0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(560, 150, 580, 450, 20)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#b060ff'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('📊 ESTADO DEL SISTEMA', 595, 200)

    const stats = [
      { label: 'ESTADO DEL BOT', val: botStatus, color: '#00e676' },
      { label: 'VELOCIDAD / PING', val: pingValue, color: '#ffd54f' },
      { label: 'CALIFICACIÓN', val: statusLentitud, color: '#00e676' },
      { label: 'TIEMPO ACTIVO (UPTIME)', val: uptimeText, color: '#ffffff' },
      { label: 'USUARIO', val: `${userName.slice(0, 16)} (@${userNum})`, color: '#b060ff' },
      { label: 'DOMINIO', val: botname, color: '#f0c040' }
    ]

    stats.forEach((st, idx) => {
      const y = 250 + (idx * 55)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.beginPath()
      ctx.roundRect(595, y - 28, 510, 44, 10)
      ctx.fill()

      ctx.fillStyle = 'rgba(240, 240, 240, 0.72)'
      ctx.font = 'bold 14px monospace'
      ctx.fillText(st.label, 610, y)

      ctx.fillStyle = st.color
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(st.val, 830, y)
    })

    // 8. Pie de página decorativo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.font = '13px monospace'
    ctx.fillText('SHADOW GARDEN INTERFACE • VELOCIDAD MÁXIMA EN TIEMPO REAL', 60, 640)

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
          displayName: botname,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botname}\nORG:${botname};\nTEL;type=CELL;type=VOICE;waid=0:+0\nEND:VCARD`
        }
      }
    }

    // Reacción de calabaza Halloween al finalizar
    conn.sendMessage(m.chat, { react: { text: '🎃', key: m.key } }).catch(() => {})

    await conn.sendMessage(m.chat, {
      image,
      caption:
        `✨ 🎃 ¡𝐏𝐎𝐍𝐆 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍! 🦇 ✨\n\n` +
        `> 🚀 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝: *${pingValue}*\n` +
        `> ⚡ 𝐄𝐬𝐭𝐚𝐝𝐨: *${botStatus}*\n` +
        `> 🏎️ 𝐑𝐞𝐧𝐝𝐢𝐦𝐢𝐞𝐧𝐭𝐨: *${statusLentitud}*\n` +
        `> 🕯️ 𝐔𝐩𝐭𝐢𝐦𝐞: *${uptimeText}*\n` +
        `> 👤 𝐔𝐬𝐮𝐚𝐫𝐢𝐨: *${userName}* (@${userNum})\n` +
        `> 👑 𝐃𝐮𝐞𝐧̃𝐨𝐬: *𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨*\n\n` +
        `*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`,
      footer: `© ${botname} · Pong Shadow Halloween 🎃`,
      mentions: [userId]
    }, { quoted: fkontak })

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
