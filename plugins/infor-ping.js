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

const pingLabel = (ms) => {
  if (ms < 100) return 'RAPIDO'
  if (ms < 300) return 'NORMAL'
  return 'LENTO'
}

let handler = async (m, { conn }) => {
  const start = performance.now()
  const userId   = m.sender
  const userName = escapeXml(conn.getName(userId) || 'Usuario')
  const userNum  = userId.split('@')[0]
  const botname  = escapeXml(global.author || 'Shadow Bot')

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const ping = Math.max(0, Math.round(performance.now() - start))
    const up   = process.uptime()
    const hh   = String(Math.floor(up / 3600)).padStart(2, '0')
    const mm   = String(Math.floor((up % 3600) / 60)).padStart(2, '0')
    const ss   = String(Math.floor(up % 60)).padStart(2, '0')
    const uptimeText = `${hh}:${mm}:${ss}`

    const shadowPath   = path.join(process.cwd(), 'lib', 'Shadow.webp')
    const shadowBuffer = fs.existsSync(shadowPath) ? fs.readFileSync(shadowPath) : null

    const W = 1600
    const H = 900

    const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#04020e"/>
    <stop offset="60%" stop-color="#0d0522"/>
    <stop offset="100%" stop-color="#180838"/>
  </linearGradient>
  <radialGradient id="ambLeft" cx="0%" cy="100%" r="60%">
    <stop offset="0%" stop-color="#c89020" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="#c89020" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ambRight" cx="100%" cy="0%" r="55%">
    <stop offset="0%" stop-color="#8030d0" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#8030d0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="panelL" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#140b28" stop-opacity="0.97"/>
    <stop offset="100%" stop-color="#080414" stop-opacity="0.97"/>
  </linearGradient>
  <linearGradient id="panelR" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0e0820" stop-opacity="0.97"/>
    <stop offset="100%" stop-color="#06030f" stop-opacity="0.97"/>
  </linearGradient>
  <linearGradient id="mc" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#1c1030" stop-opacity="0.85"/>
    <stop offset="100%" stop-color="#0f0820" stop-opacity="0.85"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#f0c040"/>
    <stop offset="100%" stop-color="#d09020"/>
  </linearGradient>
  <linearGradient id="purpleG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#b060ff"/>
    <stop offset="100%" stop-color="#7030c0"/>
  </linearGradient>
  <linearGradient id="outerStroke" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f0c040" stop-opacity="0.8"/>
    <stop offset="50%" stop-color="#b060ff" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#f0c040" stop-opacity="0.8"/>
  </linearGradient>
  <filter id="panelShadow" x="-5%" y="-5%" width="110%" height="115%">
    <feDropShadow dx="0" dy="6" stdDeviation="24" flood-color="#000000" flood-opacity="0.75"/>
  </filter>
  <filter id="blur40">
    <feGaussianBlur stdDeviation="40"/>
  </filter>
  <filter id="blur20">
    <feGaussianBlur stdDeviation="20"/>
  </filter>
  <clipPath id="outerFrame">
    <rect x="50" y="50" width="1500" height="800" rx="32"/>
  </clipPath>
</defs>

<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#ambLeft)"/>
<rect width="${W}" height="${H}" fill="url(#ambRight)"/>
<circle cx="160" cy="780" r="200" fill="#c89020" opacity="0.07" filter="url(#blur40)"/>
<circle cx="1440" cy="120" r="240" fill="#8030d0" opacity="0.09" filter="url(#blur40)"/>

<g opacity="0.045" clip-path="url(#outerFrame)">
  <line x1="0" y1="150" x2="${W}" y2="150" stroke="#8060b0" stroke-width="1"/>
  <line x1="0" y1="300" x2="${W}" y2="300" stroke="#8060b0" stroke-width="1"/>
  <line x1="0" y1="450" x2="${W}" y2="450" stroke="#8060b0" stroke-width="1"/>
  <line x1="0" y1="600" x2="${W}" y2="600" stroke="#8060b0" stroke-width="1"/>
  <line x1="0" y1="750" x2="${W}" y2="750" stroke="#8060b0" stroke-width="1"/>
  <line x1="300" y1="0" x2="300" y2="${H}" stroke="#8060b0" stroke-width="1"/>
  <line x1="600" y1="0" x2="600" y2="${H}" stroke="#8060b0" stroke-width="1"/>
  <line x1="900" y1="0" x2="900" y2="${H}" stroke="#8060b0" stroke-width="1"/>
  <line x1="1200" y1="0" x2="1200" y2="${H}" stroke="#8060b0" stroke-width="1"/>
</g>

<rect x="50" y="50" width="1500" height="800" rx="32"
      fill="none" stroke="url(#outerStroke)" stroke-width="2"/>
<rect x="56" y="56" width="1488" height="788" rx="28"
      fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>

<rect x="50" y="50" width="1500" height="120" rx="32" fill="#08041a" fill-opacity="0.92"/>
<rect x="50" y="130" width="1500" height="40" fill="#08041a" fill-opacity="0.92"/>
<line x1="50" y1="170" x2="1550" y2="170" stroke="url(#outerStroke)" stroke-width="1.5" stroke-opacity="0.5"/>

<text x="96" y="115"
      fill="#ffffff" font-size="56" font-weight="900"
      font-family="'Arial Black', Impact, sans-serif"
      letter-spacing="10">PONGSHADOW</text>
<text x="96" y="148"
      fill="#f0c040" font-size="15"
      font-family="'Courier New', monospace"
      letter-spacing="5" opacity="0.75">KAGE NO JITSURYOKUSHA NI NARITAKUTE  ·  SHADOW GARDEN INTERFACE</text>

<rect x="1240" y="70" width="290" height="50" rx="14"
      fill="#0c0620" stroke="#f0c040" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="1385" y="103"
      text-anchor="middle" fill="#f0c040" font-size="20" font-weight="700"
      font-family="'Courier New', monospace" letter-spacing="2">${botname}</text>

<rect x="60" y="185" width="660" height="640" rx="22"
      fill="url(#panelL)" stroke="#f0c040" stroke-opacity="0.18" stroke-width="1.5"
      filter="url(#panelShadow)"/>
<rect x="60" y="185" width="660" height="52" rx="22" fill="#f0c040" fill-opacity="0.07"/>
<rect x="60" y="207" width="660" height="30" fill="#f0c040" fill-opacity="0.07"/>
<text x="88" y="221"
      fill="#f0c040" font-size="20" font-weight="700"
      font-family="'Courier New', monospace" letter-spacing="4">PING STATUS</text>
<circle cx="626" cy="213" r="7" fill="#00e676"/>
<text x="614" y="217" text-anchor="end" fill="#00e676" font-size="14"
      font-family="'Courier New', monospace" letter-spacing="1">ONLINE</text>
<line x1="76" y1="237" x2="704" y2="237" stroke="#f0c040" stroke-opacity="0.12" stroke-width="1"/>

<rect x="80" y="252" width="620" height="84" rx="14"
      fill="url(#mc)" stroke="#f0c040" stroke-opacity="0.2" stroke-width="1"/>
<text x="104" y="279"
      fill="#f0c040" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">LATENCIA</text>
<text x="104" y="320"
      fill="#ffffff" font-size="40" font-weight="900"
      font-family="'Arial Black', sans-serif">${ping}<tspan font-size="20" fill="#f0c040" opacity="0.8"> ms</tspan></text>
<rect x="540" y="276" width="130" height="34" rx="17"
      fill="#f0c040" fill-opacity="0.12" stroke="#f0c040" stroke-opacity="0.45" stroke-width="1"/>
<text x="605" y="298" text-anchor="middle"
      fill="#f0c040" font-size="13" font-family="'Courier New', monospace" letter-spacing="1">${pingLabel(ping)}</text>

<rect x="80" y="352" width="620" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="104" y="376"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">USUARIO</text>
<text x="104" y="417"
      fill="#ffffff" font-size="30" font-weight="700"
      font-family="'Arial Black', sans-serif">${userName}</text>

<rect x="80" y="448" width="620" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="104" y="472"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">NÚMERO</text>
<text x="104" y="513"
      fill="#ffffff" font-size="26" font-weight="700"
      font-family="'Courier New', monospace">@${userNum}</text>

<rect x="80" y="544" width="298" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="104" y="568"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">UPTIME</text>
<text x="104" y="609"
      fill="#ffffff" font-size="26" font-weight="700"
      font-family="'Courier New', monospace">${uptimeText}</text>

<rect x="402" y="544" width="298" height="80" rx="14"
      fill="url(#mc)" stroke="#f0c040" stroke-opacity="0.15" stroke-width="1"/>
<text x="426" y="568"
      fill="#f0c040" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">POTENCIA</text>
<rect x="426" y="578" width="250" height="10" rx="5" fill="#ffffff" fill-opacity="0.1"/>
<rect x="426" y="578" width="250" height="10" rx="5" fill="url(#gold)" opacity="0.9"/>
<text x="426" y="608"
      fill="#f0c040" font-size="22" font-weight="700"
      font-family="'Courier New', monospace">100%</text>

<line x1="76" y1="642" x2="704" y2="642" stroke="#f0c040" stroke-opacity="0.1" stroke-width="1"/>
<text x="88" y="664"
      fill="#ffffff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="2" opacity="0.28">POWER: 100% CAPACITY  ·  LINUX SPEED: MAX</text>
<text x="88" y="684"
      fill="#ffffff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="2" opacity="0.28">GENERATED IN REAL TIME  ·  SHADOW GARDEN</text>
<text x="88" y="704"
      fill="#ffffff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="2" opacity="0.28">© ${botname}  ·  PING VISUAL CARD</text>

<rect x="740" y="185" width="500" height="640" rx="22"
      fill="url(#panelR)" stroke="#b060ff" stroke-opacity="0.18" stroke-width="1.5"
      filter="url(#panelShadow)"/>
<rect x="740" y="185" width="500" height="52" rx="22" fill="#b060ff" fill-opacity="0.07"/>
<rect x="740" y="207" width="500" height="30" fill="#b060ff" fill-opacity="0.07"/>
<text x="768" y="221"
      fill="#b060ff" font-size="20" font-weight="700"
      font-family="'Courier New', monospace" letter-spacing="4">SHADOW MODE</text>
<rect x="1130" y="200" width="96" height="26" rx="13"
      fill="#b060ff" fill-opacity="0.14" stroke="#b060ff" stroke-opacity="0.5" stroke-width="1"/>
<text x="1178" y="218" text-anchor="middle"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace" letter-spacing="1">KAGE</text>
<line x1="756" y1="237" x2="1228" y2="237" stroke="#b060ff" stroke-opacity="0.12" stroke-width="1"/>

<rect x="760" y="252" width="460" height="80" rx="14"
      fill="url(#mc)" stroke="#b060ff" stroke-opacity="0.2" stroke-width="1"/>
<text x="784" y="276"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">DOMINIO</text>
<text x="784" y="317"
      fill="#ffffff" font-size="26" font-weight="700"
      font-family="'Arial Black', sans-serif">${botname}</text>

<rect x="760" y="348" width="218" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="784" y="372"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">TIERRA</text>
<text x="784" y="413"
      fill="#ffffff" font-size="20" font-weight="700"
      font-family="'Arial Black', sans-serif">Shadow Garden</text>

<rect x="1002" y="348" width="218" height="80" rx="14"
      fill="url(#mc)" stroke="#b060ff" stroke-opacity="0.15" stroke-width="1"/>
<text x="1026" y="372"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">BOT MODE</text>
<circle cx="1040" cy="404" r="7" fill="#b060ff" opacity="0.9"/>
<text x="1054" y="409"
      fill="#b060ff" font-size="20" font-weight="700"
      font-family="'Arial Black', sans-serif">ACTIVO</text>

<rect x="760" y="444" width="460" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="784" y="468"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">SISTEMA</text>
<text x="784" y="509"
      fill="#ffffff" font-size="22" font-weight="700"
      font-family="'Arial Black', sans-serif">Máxima Velocidad</text>

<rect x="760" y="540" width="460" height="80" rx="14"
      fill="url(#mc)" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<text x="784" y="564"
      fill="#b060ff" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">PERFIL</text>
<text x="784" y="605"
      fill="#ffffff" font-size="20" font-weight="700"
      font-family="'Arial Black', sans-serif">Convocado por las sombras</text>

<rect x="760" y="636" width="460" height="80" rx="14"
      fill="url(#mc)" stroke="#f0c040" stroke-opacity="0.18" stroke-width="1"/>
<text x="784" y="660"
      fill="#f0c040" font-size="12" font-family="'Courier New', monospace"
      letter-spacing="3" opacity="0.65">OWNER</text>
<text x="784" y="701"
      fill="#ffffff" font-size="24" font-weight="700"
      font-family="'Arial Black', sans-serif">Yosue <tspan fill="#f0c040">(Shadow)</tspan> &amp; Ado</text>

<rect x="1258" y="168" width="6" height="662"
      fill="url(#purpleG)" opacity="0.25" filter="url(#blur20)"/>

<text x="96" y="872"
      fill="#ffffff" fill-opacity="0.28" font-size="14"
      font-family="'Courier New', monospace" letter-spacing="3">SHADOW GARDEN INTERFACE  ·  PING VISUAL CARD  ·  REAL TIME</text>
<text x="1504" y="872" text-anchor="end"
      fill="#f0c040" fill-opacity="0.45" font-size="14"
      font-family="'Courier New', monospace">© ${botname}</text>

<polygon points="1538,62 1550,74 1538,86 1526,74" fill="#f0c040" opacity="0.3"/>
<polygon points="62,826 74,838 62,850 50,838" fill="#b060ff" opacity="0.3"/>
</svg>`

    let compositor = sharp(Buffer.from(svg)).png()

    if (shadowBuffer) {
      const char = await sharp(shadowBuffer)
        .resize(290, 680, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer()

      compositor = compositor.composite([
        { input: char, left: 1265, top: 175, blend: 'over' }
      ])
    }

    const image = await compositor.toBuffer()

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

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    await conn.sendMessage(m.chat, {
      image,
      caption: `✨ ¡𝐏𝐎𝐍𝐆! ✨\n\n> 🌌 𝐓𝐢𝐞𝐦𝐩𝐨: ${ping}𝐦𝐬\n> 👤 𝐔𝐬𝐮𝐚𝐫𝐢𝐨: ${userName} (@${userNum})\n> 👑 𝐃𝐮𝐞𝐧̃𝐨𝐬: 𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨\n> 🏎️ 𝐋𝐢𝐧𝐮𝐱 𝐒𝐩𝐞𝐞𝐝: 𝐌𝐚́𝐱𝐢𝐦𝐚 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝 🚀\n\n*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`,
      footer: `© ${botname} · Pong shadow`,
      mentions: [userId]
    }, { quoted: fkontak })

  } catch (e) {
    console.error('PING ERROR:', e)
    await conn.sendMessage(m.chat, {
      text: `❌ Error en el sistema de ping.\n\n${e?.message || e}`
    }, { quoted: m })
  }
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping', 'p']

export default handler
