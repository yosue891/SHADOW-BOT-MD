import { performance } from 'node:perf_hooks'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const escapeXml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes)) return '0 MB'
  const mb = bytes / 1024 / 1024
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

const getShadowImagePath = () => {
  const candidates = [
    path.join(process.cwd(), 'lib', 'Shadow.webp'),
    path.join(process.cwd(), 'lib', 'shadow.webp'),
    path.join(process.cwd(), 'media', 'Shadow.webp'),
    path.join(process.cwd(), 'src', 'Shadow.webp')
  ]

  for (const file of candidates) {
    if (fs.existsSync(file)) return file
  }
  return null
}

let handler = async (m, { conn }) => {
  const start = performance.now()

  const userId = m.sender
  const userName = escapeXml(conn.getName(userId) || 'Usuario')
  const userNumber = userId.split('@')[0]
  const botname = escapeXml(global.author || 'Shadow Bot')

  const { key } = await conn.reply(m.chat, '❐ 𝐂𝐚𝐥𝐜𝐮𝐥𝐚𝐧𝐝𝐨 𝐏𝐢𝐧𝐠... 🚀', m)

  try {
    const ping = Math.max(0, Math.round(performance.now() - start))
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const uptimeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const mem = process.memoryUsage()
    const rss = formatBytes(mem.rss)
    const heapUsed = formatBytes(mem.heapUsed)
    const heapTotal = formatBytes(mem.heapTotal)
    const platform = escapeXml(process.platform)
    const arch = escapeXml(process.arch)
    const nodeVersion = escapeXml(process.version)
    const pid = process.pid

    const shadowFile = getShadowImagePath()
    const shadowBuffer = shadowFile ? fs.readFileSync(shadowFile) : null

    const width = 1600
    const height = 900

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090611"/>
      <stop offset="50%" stop-color="#140b22"/>
      <stop offset="100%" stop-color="#25143d"/>
    </linearGradient>

    <radialGradient id="glowA" cx="72%" cy="18%" r="45%">
      <stop offset="0%" stop-color="#c58cff" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#c58cff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#c58cff" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glowB" cx="18%" cy="82%" r="42%">
      <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="#f4c95d" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#f4c95d" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#120b1d" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#09060f" stop-opacity="0.92"/>
    </linearGradient>

    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#c58cff" stop-opacity="0.95"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.66"/>
    </filter>

    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#glowA)"/>
  <rect width="1600" height="900" fill="url(#glowB)"/>

  <g opacity="0.10">
    <path d="M0 120 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 210 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 300 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 390 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 480 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 570 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 660 H1600" stroke="#ffffff" stroke-width="1"/>
  </g>

  <g opacity="0.20">
    <circle cx="1360" cy="120" r="130" fill="#c58cff" filter="url(#blur)"/>
    <circle cx="220" cy="790" r="210" fill="#f4c95d" filter="url(#blur)"/>
  </g>

  <g opacity="0.10">
    <path d="M80 30 L240 0 L400 30 L240 60 Z" fill="#f4c95d"/>
    <path d="M1240 770 L1400 710 L1560 770 L1400 830 Z" fill="#c58cff"/>
  </g>

  <rect x="78" y="78" width="1444" height="744" rx="42" fill="url(#panel)" stroke="url(#stroke)" stroke-width="3" filter="url(#shadow)"/>
  <rect x="102" y="102" width="1396" height="696" rx="34" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>

  <text x="120" y="160" fill="#f4c95d" font-size="28" font-family="Arial, Helvetica, sans-serif" letter-spacing="6">KAGE NO JITSURYOKUSHA NI NARITAKUTE</text>
  <text x="120" y="215" fill="#ffffff" font-size="62" font-weight="700" font-family="Arial, Helvetica, sans-serif" letter-spacing="4">P O N G   S H A D O W</text>
  <text x="120" y="252" fill="#cbb6ff" font-size="24" font-family="Arial, Helvetica, sans-serif">Shadow Garden Interface · Performance Card</text>

  <g transform="translate(1045 124)">
    <rect x="0" y="0" width="330" height="72" rx="22" fill="#0b0712" fill-opacity="0.88" stroke="#f4c95d" stroke-opacity="0.9" stroke-width="2"/>
    <text x="165" y="31" text-anchor="middle" fill="#ffffff" font-size="24" font-weight="700" font-family="Arial, Helvetica, sans-serif">${botname}</text>
    <text x="165" y="54" text-anchor="middle" fill="#c58cff" font-size="16" font-family="Arial, Helvetica, sans-serif">REAL SYSTEM INFO</text>
  </g>

  <g transform="translate(118 315)">
    <rect x="0" y="0" width="720" height="370" rx="34" fill="#09060f" fill-opacity="0.74" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    <text x="34" y="56" fill="#f4c95d" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">Ping Status</text>

    <text x="34" y="110" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Tiempo: ${ping} ms</text>
    <text x="34" y="154" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Usuario: ${userName}</text>
    <text x="34" y="198" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Número: @${userNumber}</text>
    <text x="34" y="242" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Estado: Online</text>
    <text x="34" y="286" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Uptime: ${uptimeText}</text>
    <text x="34" y="330" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Power: 100% Capacity</text>

    <rect x="450" y="82" width="225" height="38" rx="19" fill="#f4c95d" fill-opacity="0.16" stroke="#f4c95d" stroke-opacity="0.55"/>
    <text x="562" y="108" text-anchor="middle" fill="#f4c95d" font-size="21" font-family="Arial, Helvetica, sans-serif">LATENCY REPORT</text>
  </g>

  <g transform="translate(880 315)">
    <rect x="0" y="0" width="620" height="370" rx="34" fill="#09060f" fill-opacity="0.74" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    <text x="34" y="56" fill="#c58cff" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">System Info</text>

    <text x="34" y="108" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">Node: ${nodeVersion}</text>
    <text x="34" y="150" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">Platform: ${platform}</text>
    <text x="34" y="192" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">Architecture: ${arch}</text>
    <text x="34" y="234" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">PID: ${pid}</text>
    <text x="34" y="276" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">RAM RSS: ${rss}</text>
    <text x="34" y="318" fill="#ffffff" font-size="25" font-family="Arial, Helvetica, sans-serif">Heap: ${heapUsed} / ${heapTotal}</text>

    <rect x="405" y="82" width="180" height="44" rx="22" fill="#c58cff" fill-opacity="0.16" stroke="#c58cff" stroke-opacity="0.55"/>
    <text x="495" y="110" text-anchor="middle" fill="#c58cff" font-size="21" font-family="Arial, Helvetica, sans-serif">REAL DATA</text>
  </g>

  <g transform="translate(1120 190)">
    <rect x="0" y="0" width="290" height="420" rx="30" fill="#0b0712" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    <rect x="14" y="14" width="262" height="392" rx="24" fill="#000000" fill-opacity="0.08"/>
  </g>

  <text x="120" y="820" fill="#ffffff" fill-opacity="0.72" font-size="22" font-family="Arial, Helvetica, sans-serif">Shadow Garden Interface · Ping visual card generated in real time</text>
  <text x="1500" y="820" text-anchor="end" fill="#f4c95d" font-size="22" font-family="Arial, Helvetica, sans-serif">© ${botname}</text>
</svg>`

    let base = sharp(Buffer.from(svg)).png()

    if (shadowBuffer) {
      const resized = await sharp(shadowBuffer)
        .resize(440, 440, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer()

      base = base.composite([
        {
          input: resized,
          left: 1145,
          top: 205
        }
      ])
    }

    const image = await base.toBuffer()

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

    await conn.sendMessage(m.chat, { delete: key })

    await conn.sendMessage(m.chat, {
      image,
      caption: `✨ ¡𝐏𝐎𝐍𝐆! ✨\n\n> 🌌 𝐓𝐢𝐞𝐦𝐩𝐨: ${ping}𝐦𝐬\n> 👤 𝐔𝐬𝐮𝐚𝐫𝐢𝐨: ${userName} (@${userNumber})\n> 👑 𝐃𝐮𝐞𝐧̃𝐨𝐬: 𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨\n> 🏎️ 𝐋𝐢𝐧𝐮𝐱 𝐒𝐩𝐞𝐞𝐝: 𝐌𝐚́𝐱𝐢𝐦𝐚 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝 🚀\n\n*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`,
      footer: `© ${botname} · Pong shadow`,
      mentions: [userId]
    }, { quoted: fkontak })

  } catch (e) {
    console.error('PING ERROR:', e)
    await conn.sendMessage(
      m.chat,
      { text: `❌ Error en el sistema de ping.\n\n${e?.message || e}` },
      { quoted: m }
    )
  }
}

handler.help = ['ping']
handler.tags = ['informacion']
handler.command = ['ping', 'p']

export default handler
