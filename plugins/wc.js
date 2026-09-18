import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderWelcomeCard } from '../lib/welcome-card.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_BG = 'https://u.pone.rs/glqjtzaj.jpg'
const LOCAL_BG = path.join(__dirname, '..', 'lib', 'welcome-bg.jpg')
const LOCAL_AVATAR = path.join(__dirname, '..', 'lib', 'catalogo.jpg')

function parseArgs(text) {
  const args = {}
  const regex = /--(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const key = match[1]
    const value = match[2] ?? match[3] ?? match[4]
    args[key] = value
  }
  return args
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null
    const quoted = m.quoted ? m.quoted.sender : null
    const targetJid = mentioned || quoted || m.sender
    const targetNumber = targetJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') || targetJid.split('@')[0]

    let profileUrl = null
    try {
      profileUrl = await conn.profilePictureUrl(targetJid, 'image')
    } catch (e) {
      profileUrl = fs.existsSync(LOCAL_AVATAR) ? LOCAL_AVATAR : null
    }

    const groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat).catch(() => ({})) : {}
    const groupName = groupMetadata?.subject || 'Shadow Garden'
    const groupSize = groupMetadata?.participants ? `${groupMetadata.participants.length}` : '—'

    const opts = parseArgs(text || '')

    let imageBuffer = null
    try {
      imageBuffer = await renderWelcomeCard({
        backgroundUrl: opts.bg || DEFAULT_BG,
        avatarUrl: profileUrl,
        title: opts.texto1 || 'Bienvenido',
        eyebrow: opts.marca || 'S H A D O W  G A R D E N',
        username: `@${targetNumber}`,
        groupName: opts.texto2 || groupName,
        footerLine: opts.texto3 || `#${groupSize}`
      })
    } catch (renderError) {
      console.warn('[welcome-banner] Falló render canvas, usando respaldo local:', renderError.message)
      if (fs.existsSync(LOCAL_BG)) {
        imageBuffer = fs.readFileSync(LOCAL_BG)
      } else {
        imageBuffer = { url: DEFAULT_BG }
      }
    }

    const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
    const chat = global.db?.data?.chats?.[m.chat]
    const defaultWelcome = '¡Bienvenido/a a las sombras! Que tu estancia sea legendaria.'
    const mensaje = (chat?.sWelcome || defaultWelcome)
      .replace(/{usuario}/g, `@${targetNumber}`)
      .replace(/{grupo}/g, `*${groupName}*`)
      .replace(/{desc}/g, `${desc}`)
    const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })

    const caption = `> ── ⚔️ *SHADOW GARDEN* ⚔️ ──
> ​
> 🗡️ *TARJETA DE BIENVENIDA*
> ​
> ◈ 👤 *Recluta:* @${targetNumber}
> ◈ 🏰 *Sector:* *${groupName}*
> ◈ 👥 *Fuerza total:* ${groupSize} miembros
> ◈ 📜 *Dictamen:* ${mensaje}
> ◈ ⏳ *Registro:* ${fecha}
> ​
> ⛓️ _« I am atomic... The eminence in shadow. »_`

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption,
      mentions: [targetJid]
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[welcome-banner] Error:', error)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.sendMessage(m.chat, {
      text: `❌ Ocurrió un error generando el banner de bienvenida.\n\n${error?.message || error}`
    }, { quoted: m })
  }
}

handler.help = ['welcome', 'welcome @usuario']
handler.tags = ['grupos']
handler.command = ['welcome', 'bienvenida', 'banner']

export default handler
