import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderWelcomeCard, renderGoodbyeCard } from '../../lib/welcome-card.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_BG = 'https://u.pone.rs/glqjtzaj.jpg'
const LOCAL_BG = path.join(__dirname, '..', 'lib', 'welcome-bg.jpg')
const LOCAL_AVATAR = path.join(__dirname, '..', 'lib', 'catalogo.jpg')

function parseArgs(text) {
  const args = {}
  const regex = /--(\w+)=(?:\"([^\"]*)\"|'([^']*)'|(\S+))/g
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

    const isGoodbye = ['goodbye', 'bye', 'despedida'].includes(command.toLowerCase())
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
    const groupParticipants = groupMetadata?.participants ? groupMetadata.participants.length : 1
    const groupSize = `${groupParticipants}`

    const opts = parseArgs(text || '')

    let imageBuffer = null
    try {
      if (isGoodbye) {
        imageBuffer = await renderGoodbyeCard({
          backgroundUrl: opts.bg || DEFAULT_BG,
          avatarUrl: profileUrl,
          title: opts.texto1 || 'Adiós',
          username: `@${targetNumber}`,
          groupName: opts.texto2 || groupName,
          footerLine: opts.texto3 || `Quedan ${groupSize}`
        })
      } else {
        imageBuffer = await renderWelcomeCard({
          backgroundUrl: opts.bg || DEFAULT_BG,
          avatarUrl: profileUrl,
          title: opts.texto1 || 'Bienvenido',
          eyebrow: opts.marca || 'S H A D O W  G A R D E N',
          username: `@${targetNumber}`,
          groupName: opts.texto2 || groupName,
          footerLine: opts.texto3 || `#${groupSize}`
        })
      }
    } catch (renderError) {
      console.warn('[welcome-banner] Falló render canvas, usando respaldo local:', renderError.message)
      if (fs.existsSync(LOCAL_BG)) {
        imageBuffer = fs.readFileSync(LOCAL_BG)
      } else {
        imageBuffer = { url: DEFAULT_BG }
      }
    }

    const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
    const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
    const chat = (m.isGroup && global.db?.data?.chats?.[m.chat]) || {}

    let caption = ''

    if (isGoodbye) {
      const defaultBye = 'Ha abandonado la orden. Que las sombras guíen su nuevo camino.'
      const hasCustomBye = !!(chat?.sBye?.trim() || chat?.sGoodbye?.trim() || chat?.sDespedida?.trim())
      const rawBye = hasCustomBye ? (chat.sBye || chat.sGoodbye || chat.sDespedida) : defaultBye
      const mensaje = rawBye
        .replace(/@{usuario}/gi, `@${targetNumber}`)
        .replace(/{usuario}/gi, `@${targetNumber}`)
        .replace(/{user}/gi, `@${targetNumber}`)
        .replace(/{grupo}/gi, `*${groupName}*`)
        .replace(/{group}/gi, `*${groupName}*`)
        .replace(/{desc}/gi, `*${desc}*`)
        .replace(/{miembros}/gi, `${groupSize}`)
        .replace(/{fecha}/gi, `${fecha}`)

      if (hasCustomBye) {
        caption = mensaje
      } else {
        const formattedMensaje = mensaje.split('\n').join('\n> ')
        caption = `> ── ⚔️ *SHADOW GARDEN* ⚔️ ──
> ​
> 🥀 *UNA SOMBRA SE HA DESVANECIDO*
> ​
> ◈ 👤 *Identificación:* @${targetNumber}
> ◈ 🏰 *Sector:* *${groupName}*
> ◈ 👥 *Fuerza restante:* ${groupSize} unidades
> ◈ 📜 *Mensaje:* ${formattedMensaje}
> ◈ ⏳ *Registro:* ${fecha}
> ​
> ⛓️ _« La oscuridad ha borrado todo su rastro. »_`
      }
    } else {
      const defaultWelcome = '¡Bienvenido/a a las sombras! Que tu estancia sea legendaria.'
      const hasCustomWelcome = !!(chat?.sWelcome?.trim() || chat?.sBienvenida?.trim())
      const rawWelcome = hasCustomWelcome ? (chat.sWelcome || chat.sBienvenida) : defaultWelcome
      const mensaje = rawWelcome
        .replace(/@{usuario}/gi, `@${targetNumber}`)
        .replace(/{usuario}/gi, `@${targetNumber}`)
        .replace(/{user}/gi, `@${targetNumber}`)
        .replace(/{grupo}/gi, `*${groupName}*`)
        .replace(/{group}/gi, `*${groupName}*`)
        .replace(/{desc}/gi, `${desc}`)
        .replace(/{miembros}/gi, `${groupSize}`)
        .replace(/{fecha}/gi, `${fecha}`)

      if (hasCustomWelcome) {
        caption = mensaje
      } else {
        const formattedMensaje = mensaje.split('\n').join('\n> ')
        caption = `> ── ⚔️ *SHADOW GARDEN* ⚔️ ──
> ​
> 🗡️ *TARJETA DE BIENVENIDA*
> ​
> ◈ 👤 *Recluta:* @${targetNumber}
> ◈ 🏰 *Sector:* *${groupName}*
> ◈ 👥 *Fuerza total:* ${groupSize} miembros
> ◈ 📜 *Mensaje:* ${formattedMensaje}
> ◈ ⏳ *Registro:* ${fecha}
> ​
> ⛓️ _« I am atomic... The eminence in shadow. »_`
      }
    }

    const canalId = global.channelRD?.id || '120363403739366547@newsletter'
    const canalName = global.channelRD?.name || 'SHADOW-BOT'

    const contextInfo = {
      mentionedJid: [targetJid],
      isForwarded: true,
      forwardingScore: 0,
      forwardedNewsletterMessageInfo: {
        newsletterJid: canalId,
        serverMessageId: null,
        newsletterName: canalName
      }
    }

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption,
      mentions: [targetJid],
      contextInfo
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[welcome-banner] Error:', error)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.sendMessage(m.chat, {
      text: `❌ Ocurrió un error generando el banner:\n\n${error?.message || error}`
    }, { quoted: m })
  }
}

handler.help = ['welcome [@usuario]', 'goodbye [@usuario]']
handler.tags = ['grupos']
handler.command = ['welcome', 'bienvenida', 'banner', 'goodbye', 'bye', 'despedida']

export default handler
