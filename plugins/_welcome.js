import fs from 'fs'
import { WAMessageStubType } from '@whiskeysockets/baileys'
import { renderWelcomeCard, renderGoodbyeCard } from '../lib/welcome-card.js'

const canalId = '120363403739366547@newsletter'
const canalName = 'SHADOW-BOT'
const BACKGROUND = 'https://u.pone.rs/glqjtzaj.jpg'
const DEFAULT_AVATAR = 'https://i.ibb.co/3NfYh9k/default-avatar.png'

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = userId.split('@')[0]
  const username = `@${targetNumber}`
  const groupName = groupMetadata.subject || 'el Grupo'

  let profileUrl
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = DEFAULT_AVATAR
  }

  const groupSize = groupMetadata.participants.length + 1
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
    console.error('[WELCOME] Falló el render con canvas (¿npm install pendiente?), se usa fondo plano:', err.message)
    imageSource = { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sWelcome || 'Edita con el comando "setwelcome"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `*${groupName}*`).replace(/{desc}/g, `${desc}`)

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
  const targetNumber = userId.split('@')[0]
  const username = `@${targetNumber}`
  const groupName = groupMetadata.subject || 'el Grupo'

  let profileUrl
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = DEFAULT_AVATAR
  }

  const groupSize = Math.max(groupMetadata.participants.length - 1, 0)
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
    console.error('[WELCOME] Falló el render con canvas (¿npm install pendiente?), se usa fondo plano:', err.message)
    imageSource = { url: BACKGROUND }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sBye || 'Edita con el comando "setbye"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `${groupName}`).replace(/{desc}/g, `*${desc}*`)

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
  if (!chat || !chat.welcome) return !0

  const primaryBot = chat.primaryBot
  if (primaryBot && conn.user.jid !== primaryBot) return !1

  let rawUser = m.messageStubParameters?.[0]
  if (!rawUser) return !0

  console.log(`[WELCOME] Evento stub=${m.messageStubType} en ${m.chat} para ${rawUser}`)

  let userId = rawUser

  if (rawUser.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawUser)
      userId = parsed.phoneNumber || parsed.id || rawUser
    } catch (e) {}
  }

  if (!userId.includes('@')) {
    userId = `${userId.split(':')[0]}@s.whatsapp.net`
  }

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

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD || m.messageStubType == 27 || m.messageStubType == 31) {
    try {
      const { imageSource, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })
      const opts = { caption, mentions, contextInfo }
      opts.image = Buffer.isBuffer(imageSource) ? imageSource : imageSource
      await conn.sendMessage(m.chat, opts, { quoted: null })
      console.log('[WELCOME] Bienvenida enviada a', userId)
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando bienvenida:', err)
    }
  }

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE || m.messageStubType == 28 || m.messageStubType == 32) {
    try {
      const { imageSource, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })
      const opts = { caption, mentions, contextInfo }
      opts.image = Buffer.isBuffer(imageSource) ? imageSource : imageSource
      await conn.sendMessage(m.chat, opts, { quoted: null })
      console.log('[WELCOME] Despedida enviada a', userId)
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando despedida:', err)
    }
  }
}

export default handler
