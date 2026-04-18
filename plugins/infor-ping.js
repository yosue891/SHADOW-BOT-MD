import speed from 'performance-now'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

let handler = async (m, { conn, usedPrefix }) => {
  const start = speed()
  const userId = m.sender
  const userName = conn.getName(userId)
  const userNumber = userId.split('@')[0]
  const botname = global.author || 'Shadow Bot'

  const { key } = await conn.reply(m.chat, '❐ 𝐂𝐚𝐥𝐜𝐮𝐥𝐚𝐧𝐝𝐨 𝐏𝐢𝐧𝐠... 🚀', m)

  try {
    const latency = speed() - start
    const ping = Math.max(0, Math.round(latency))
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const uptimeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const shadowPath = path.resolve('./../lib/Shadow.webp')
    const shadowBuffer = fs.existsSync(shadowPath) ? fs.readFileSync(shadowPath) : null

    const width = 1600
    const height = 900

    const bg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05030a"/>
      <stop offset="45%" stop-color="#12071f"/>
      <stop offset="100%" stop-color="#24103f"/>
    </linearGradient>
    <radialGradient id="glow1" cx="68%" cy="22%" r="48%">
      <stop offset="0%" stop-color="#b86cff" stop-opacity="0.34"/>
      <stop offset="50%" stop-color="#b86cff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#b86cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="22%" cy="78%" r="42%">
      <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#f4c95d" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#f4c95d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a102a" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#0c0714" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#c58cff" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#g1)"/>
  <rect width="1600" height="900" fill="url(#glow1)"/>
  <rect width="1600" height="900" fill="url(#glow2)"/>
  <g opacity="0.22">
    <circle cx="1350" cy="130" r="145" fill="#c58cff" filter="url(#soft)"/>
    <circle cx="250" cy="790" r="220" fill="#f4c95d" filter="url(#soft)"/>
  </g>
  <g opacity="0.16">
    <path d="M0 680 C210 610, 330 760, 520 690 S860 600, 1040 700 S1330 820, 1600 690 L1600 900 L0 900 Z" fill="#ffffff"/>
  </g>
  <g opacity="0.12">
    <path d="M0 120 H1600" stroke="#ffffff" stroke-width="2"/>
    <path d="M0 210 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 300 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 390 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 480 H1600" stroke="#ffffff" stroke-width="1"/>
    <path d="M0 570 H1600" stroke="#ffffff" stroke-width="1"/>
  </g>
  <g opacity="0.14">
    <path d="M120 90 L260 20 L400 90 L260 160 Z" fill="#f4c95d"/>
    <path d="M1240 740 L1400 660 L1540 740 L1400 820 Z" fill="#c58cff"/>
  </g>
  <rect x="78" y="78" width="1444" height="744" rx="42" fill="url(#panel)" stroke="url(#stroke)" stroke-width="3" filter="url(#shadow)"/>
  <rect x="102" y="102" width="1396" height="696" rx="34" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
  <text x="120" y="160" fill="#f4c95d" font-size="28" font-family="Arial, Helvetica, sans-serif" letter-spacing="6">KAGE NO JITSURYOKUSHA NI NARITAKUTE</text>
  <text x="120" y="215" fill="#ffffff" font-size="62" font-weight="700" font-family="Arial, Helvetica, sans-serif">P O N G   S H A D O W</text>
  <text x="120" y="252" fill="#cbb6ff" font-size="24" font-family="Arial, Helvetica, sans-serif">Shadow Garden Interface · Performance Card</text>
  <g transform="translate(1050 125)">
    <rect x="0" y="0" width="300" height="70" rx="20" fill="#0b0712" stroke="#f4c95d" stroke-opacity="0.9" stroke-width="2"/>
    <text x="150" y="46" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="700" font-family="Arial, Helvetica, sans-serif">${botname}</text>
  </g>
  <g transform="translate(120 315)">
    <rect x="0" y="0" width="720" height="370" rx="34" fill="#09060f" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    <text x="34" y="56" fill="#f4c95d" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">Ping Status</text>
    <text x="34" y="112" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Tiempo: ${ping} ms</text>
    <text x="34" y="160" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Usuario: ${userName}</text>
    <text x="34" y="208" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Número: @${userNumber}</text>
    <text x="34" y="256" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Estado: Online</text>
    <text x="34" y="304" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Uptime: ${uptimeText}</text>
    <text x="34" y="352" fill="#ffffff" font-size="28" font-family="Arial, Helvetica, sans-serif">Power: 100% Capacity</text>
    <rect x="455" y="86" width="220" height="36" rx="18" fill="#f4c95d" fill-opacity="0.18" stroke="#f4c95d" stroke-opacity="0.6"/>
    <text x="565" y="112" text-anchor="middle" fill="#f4c95d" font-size="22" font-family="Arial, Helvetica, sans-serif">LATENCY REPORT</text>
  </g>
  <g transform="translate(890 315)">
    <rect x="0" y="0" width="590" height="370" rx="34" fill="#09060f" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
    <text x="34" y="56" fill="#c58cff" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">Shadow Mode</text>
    <text x="34" y="112" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Dominio: ${botname}</text>
    <text x="34" y="160" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Tierra: Shadow Garden</text>
    <text x="34" y="208" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Sistema: Máxima Velocidad</text>
    <text x="34" y="256" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Perfil: Convocado por las sombras</text>
    <text x="34" y="304" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Bot Mode: Activo</text>
    <text x="34" y="352" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif">Owner: Yosue (Shadow) & Ado</text>
    <rect x="362" y="82" width="194" height="44" rx="22" fill="#c58cff" fill-opacity="0.18" stroke="#c58cff" stroke-opacity="0.6"/>
    <text x="459" y="112" text-anchor="middle" fill="#c58cff" font-size="22" font-family="Arial, Helvetica, sans-serif">KAGE VIBES</text>
  </g>
  <text x="120" y="820" fill="#ffffff" fill-opacity="0.72" font-size="22" font-family="Arial, Helvetica, sans-serif">Shadow Garden Interface · Ping visual card generated in real time</text>
  <text x="1500" y="820" text-anchor="end" fill="#f4c95d" font-size="22" font-family="Arial, Helvetica, sans-serif">© ${botname}</text>
</svg>`

    let base = sharp(Buffer.from(bg)).png()

    if (shadowBuffer) {
      const resized = await sharp(shadowBuffer)
        .resize(610, 610, { fit: 'contain' })
        .toBuffer()

      base = base.composite([{ input: resized, left: 1030, top: 210 }])
    }

    const image = await base.png().toBuffer()

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
    console.error(e)
    await conn.sendMessage(m.chat, { text: '❌ Error en el sistema de ping.' }, { quoted: m })
  }
}

handler.help = ['ping']
handler.tags = ['informacion']
handler.command = ['ping', 'p']

export default handler
