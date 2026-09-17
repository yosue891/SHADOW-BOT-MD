import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WAMessageStubType } from '@whiskeysockets/baileys'
import { renderWelcomeCard, renderGoodbyeCard } from '../lib/welcome-card.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const canalId = '120363403739366547@newsletter'
const canalName = 'SHADOW-BOT'
const BACKGROUND = 'https://u.pone.rs/glqjtzaj.jpg'
const LOCAL_BG = path.join(__dirname, '..', 'lib', 'welcome-bg.jpg')
const LOCAL_AVATAR = path.join(__dirname, '..', 'lib', 'catalogo.jpg')

function extractUserId(rawUser) {
  if (!rawUser) return null
  let id = ''

  if (typeof rawUser === 'object' && rawUser !== null) {
    id = rawUser.phoneNumber || rawUser.id || rawUser.jid || ''
  } else if (typeof rawUser === 'string') {
    const trimmed = rawUser.trim()
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        id = parsed.phoneNumber || parsed.id || parsed.jid || trimmed
      } catch {
        id = trimmed
      }
    } else {
      id = trimmed
    }
  }

  if (!id || typeof id !== 'string') return null

  // Normalizar JID: extraer número limpio sin sufijos de dispositivo (:1, :2)
  const cleanNum = id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (cleanNum) {
    return `${cleanNum}@s.whatsapp.net`
  }
  return id.includes('@') ? id : `${id}@s.whatsapp.net`
}

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = userId.split('@')[0].split(':')[0]
  const username = `@${targetNumber}`
  const groupName = groupMetadata?.subject || 'el Grupo'

  let profileUrl = null
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = fs.existsSync(LOCAL_AVATAR) ? LOCAL_AVATAR : null
  }

  const participantsCount = groupMetadata?.participants?.length || 0
  const groupSize = participantsCount + 1

  let imageSource
  try {
    imageSource = await renderWelcomeCard({
      backgroundUrl: BACKGROUND,
      avatarUrl: profileUrl,
      title: 'Bienvenido',
      username,
      groupName,
      footerLine: `#${groupSize}`
    })
  } catch (err) {
    console.error('[WELCOME] Falló el render con canvas, usando fondo plano:', err.message)
    imageSource = fs.existsSync(LOCAL_BG) ? fs.readFileSync(LOCAL_BG) : { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
  const mensaje = (chat?.sWelcome || 'Edita con el comando "setwelcome"')
    .replace(/{usuario}/g, `${username}`)
    .replace(/{grupo}/g, `*${groupName}*`)
    .replace(/{desc}/g, `${desc}`)

  const caption = `> ⚔ ── ── ── ── ── ── ⚔
>  ── ── ✦ 🔖𝔥𝔞𝔡𝔬𝔴 𝔊𝔞𝔯𝔡𝔢𝔫 ✦ ── ──
> 
> 𝔘𝔫 𝔫𝔲𝔢𝔳𝔬 𝔠𝔬𝔫𝔱𝔯𝔞𝔱𝔦𝔰𝔱𝔞 𝔰𝔢 𝔲𝔫𝔢 𝔞 𝔩𝔞𝔰 𝔰𝔬𝔪𝔟𝔯𝔞𝔰.
> 
> ❖ 𝔖𝔢𝔠𝔱𝔬𝔯 ⪢ _${groupName}_
> ❖ ℑ𝔡𝔢𝔫𝔱𝔦𝔣𝔦𝔠𝔞𝔠𝔦𝔬́𝔫 ⪢ ${username}
> ❖ 𝔇𝔦𝔠𝔱𝔞𝔪𝔢𝔫 ⪢ ${mensaje}
> ❖ ℭ𝔬𝔫𝔱𝔢𝔫𝔠𝔦𝔬́𝔫 ⪢ ${groupSize} unidades reunidas.
> ❖ ℭ𝔯𝔬𝔫𝔬𝔰 ⪢ ${fecha}
> 
> ⛓ ── ℑ 𝔞𝔪 𝔞𝔱𝔬𝔪𝔦𝔠... 𝔗𝔥𝔢 𝔢𝔪𝔦𝔫𝔢𝔢 𝔦𝔫 𝔰𝔥𝔞𝔡𝔬𝔴. ── ⛓`

  return { imageSource, caption, mentions: [userId] }
}

export async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = userId.split('@')[0].split(':')[0]
  const username = `@${targetNumber}`
  const groupName = groupMetadata?.subject || 'el Grupo'

  let profileUrl = null
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = fs.existsSync(LOCAL_AVATAR) ? LOCAL_AVATAR : null
  }

  const participantsCount = groupMetadata?.participants?.length || 1
  const groupSize = Math.max(participantsCount - 1, 0)

  let imageSource
  try {
    imageSource = await renderGoodbyeCard({
      backgroundUrl: BACKGROUND,
      avatarUrl: profileUrl,
      title: 'Adiós',
      username,
      groupName,
      footerLine: `Quedan ${groupSize}`
    })
  } catch (err) {
    console.error('[WELCOME] Falló el render con canvas, usando fondo plano:', err.message)
    imageSource = fs.existsSync(LOCAL_BG) ? fs.readFileSync(LOCAL_BG) : { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata?.desc?.toString() || 'Sin descripción'
  const mensaje = (chat?.sBye || 'Edita con el comando "setbye"')
    .replace(/{usuario}/g, `${username}`)
    .replace(/{grupo}/g, `${groupName}`)
    .replace(/{desc}/g, `*${desc}*`)

  const caption = `> ⚔ ── ── ── ── ── ── ⚔
>  ── ── ✦ 𝔖𝔥𝔞𝔡𝔬𝔴 𝔊𝔞𝔯𝔡𝔢𝔫 ✦ ── ──
> 
> 𝔘𝔫𝔞 𝔭𝔯𝔢𝔰𝔢𝔫𝔠𝔦𝔞 𝔰𝔢 𝔥𝔞 𝔡𝔢𝔰𝔳𝔞𝔫𝔢𝔠𝔦𝔡𝔬.
> 
> ❖ 𝔖𝔢𝔠𝔱𝔬xr ⪢ _${groupName}_
> ❖ ℑ𝔡𝔢𝔫𝔱𝔦𝔣𝔦𝔠𝔞𝔠𝔦𝔬́𝔫 ⪢ ${username}
> ❖ 𝔇𝔦𝔠𝔱𝔞𝔪𝔢𝔫 ⪢ ${mensaje}
> ❖ ℭ𝔬𝔫𝔱𝔢𝔫𝔠𝔦𝔬́𝔫 ⪢ ${groupSize} unidades restantes.
> ❖ ℭ𝔯𝔬𝔫𝔬𝔰 ⪢ ${fecha}
> 
> ⛓ ── 𝔏𝔞 𝔬𝔰𝔠𝔲𝔯𝔦𝔡𝔞𝔡 𝔥𝔞 𝔟𝔬𝔯𝔯𝔞𝔡𝔬 𝔰𝔲 𝔯𝔞𝔰𝔱𝔯𝔬. ── ⛓`

  return { imageSource, caption, mentions: [userId] }
}

let handler = m => m
handler.before = async function (m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0

  const chat = global.db?.data?.chats?.[m.chat]
  // La bienvenida está activada por defecto si no se ha desactivado explícitamente
  if (chat && chat.welcome === false) return !0

  const primaryBot = chat?.primaryBot
  if (primaryBot) {
    const botNum = (conn.user?.jid || conn.user?.id || '').split('@')[0].split(':')[0]
    const primaryNum = primaryBot.split('@')[0].split(':')[0]
    if (botNum && primaryNum && botNum !== primaryNum) return !1
  }

  const rawUsers = Array.isArray(m.messageStubParameters)
    ? m.messageStubParameters
    : (m.messageStubParameters ? [m.messageStubParameters] : [])

  if (!rawUsers.length) return !0

  const isAdd = (
    m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD ||
    m.messageStubType == 27 ||
    m.messageStubType == 31
  )

  const isRemove = (
    m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE ||
    m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE ||
    m.messageStubType == 28 ||
    m.messageStubType == 32
  )

  if (!isAdd && !isRemove) return !0

  for (const rawUser of rawUsers) {
    const userId = extractUserId(rawUser)
    if (!userId) continue

    console.log(`[WELCOME] Evento stub=${m.messageStubType} en ${m.chat} para ${userId}`)

    const contextInfo = {
      mentionedJid: [userId],
      isForwarded: true,
      forwardingScore: 99,
      forwardedNewsletterMessageInfo: {
        newsletterJid: canalId,
        serverMessageId: null,
        newsletterName: canalName
      }
    }

    if (isAdd) {
      try {
        const { imageSource, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })
        const opts = { caption, mentions, contextInfo }
        if (Buffer.isBuffer(imageSource)) {
          opts.image = imageSource
        } else if (imageSource?.url) {
          opts.image = imageSource
        }
        try {
          await conn.sendMessage(m.chat, opts, { quoted: null })
        } catch (imgErr) {
          console.warn('[WELCOME] Falló el envío de imagen, enviando solo texto:', imgErr.message)
          await conn.sendMessage(m.chat, { text: caption, mentions, contextInfo }, { quoted: null })
        }
        console.log('[WELCOME] Bienvenida enviada con éxito a', userId)
      } catch (err) {
        console.error('[WELCOME PLUGIN] Error enviando bienvenida:', err)
      }
    } else if (isRemove) {
      try {
        const { imageSource, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })
        const opts = { caption, mentions, contextInfo }
        if (Buffer.isBuffer(imageSource)) {
          opts.image = imageSource
        } else if (imageSource?.url) {
          opts.image = imageSource
        }
        try {
          await conn.sendMessage(m.chat, opts, { quoted: null })
        } catch (imgErr) {
          console.warn('[WELCOME] Falló el envío de imagen, enviando solo texto:', imgErr.message)
          await conn.sendMessage(m.chat, { text: caption, mentions, contextInfo }, { quoted: null })
        }
        console.log('[WELCOME] Despedida enviada con éxito a', userId)
      } catch (err) {
        console.error('[WELCOME PLUGIN] Error enviando despedida:', err)
      }
    }
  }

  return !0
}

export default handler
