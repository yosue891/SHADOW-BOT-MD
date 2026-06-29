import fs from 'fs'
import fetch from 'node-fetch'
import { WAMessageStubType } from '@whiskeysockets/baileys'

const API_BASE = 'https://yosoyyo-api-ofc.onrender.com/api/image/welcome-banner'
const API_KEY = 'Andresv27728'
const canalId = '120363403739366547@newsletter'
const canalName = 'SHADOW-BOT'

const YOSOYYO_WELCOME_BANNER = {
  status: 200,
  api_name: 'YOSOYYO',
  tool: 'welcome_banner_generator',
  message: 'Imagen generada con éxito.',
  creator: 'YO SOY YO',
  data: {
    width: 1000,
    height: 500,
    backgroundUrl: 'https://u.pone.rs/pjyqbqyl.jpg',
    profileUrl: 'https://unavatar.io/github/yosue891',
    profileSize: 200,
    profileX: 500,
    profileY: 200,
    borderColor: '#03138c',
    borderWidth: 8,
    texts: [
      { text: 'Bienvenido Usuario', x: 500, y: 350, size: 65, color: '#ff0000', font: 'Arial', bold: true, align: 'center' },
      { text: 'Disfruta tu estancia', x: 500, y: 430, size: 40, color: '#ff0000', font: 'Arial', bold: false, align: 'center' }
    ]
  }
}

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const targetNumber = userId.split('@')[0]
  const username = `@${targetNumber}`
  const groupName = groupMetadata.subject || 'el Grupo'
  
  let profileUrl
  try {
    profileUrl = await conn.profilePictureUrl(userId, 'image')
  } catch (e) {
    profileUrl = 'https://i.imgur.com/0mYNUYR.png'
  }

  const params = {
    width: YOSOYYO_WELCOME_BANNER.data.width || 1000,
    height: YOSOYYO_WELCOME_BANNER.data.height || 500,
    backgroundUrl: YOSOYYO_WELCOME_BANNER.data.backgroundUrl,
    profileUrl: profileUrl,
    profileSize: YOSOYYO_WELCOME_BANNER.data.profileSize,
    profileX: YOSOYYO_WELCOME_BANNER.data.profileX,
    profileY: YOSOYYO_WELCOME_BANNER.data.profileY,
    borderColor: YOSOYYO_WELCOME_BANNER.data.borderColor,
    borderWidth: YOSOYYO_WELCOME_BANNER.data.borderWidth,
    text1: `Bienvenido ${targetNumber}`,
    text1Size: YOSOYYO_WELCOME_BANNER.data.texts[0].size,
    text1Color: YOSOYYO_WELCOME_BANNER.data.texts[0].color,
    text1X: YOSOYYO_WELCOME_BANNER.data.texts[0].x,
    text1Y: YOSOYYO_WELCOME_BANNER.data.texts[0].y,
    text2: YOSOYYO_WELCOME_BANNER.data.texts[1].text,
    text2Size: YOSOYYO_WELCOME_BANNER.data.texts[1].size,
    text2Color: YOSOYYO_WELCOME_BANNER.data.texts[1].color,
    text2X: YOSOYYO_WELCOME_BANNER.data.texts[1].x,
    text2Y: YOSOYYO_WELCOME_BANNER.data.texts[1].y,
    apiKey: API_KEY
  }

  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  const finalUrl = `${API_BASE}?${query}`

  let imageSource = YOSOYYO_WELCOME_BANNER.data.backgroundUrl
  try {
    const response = await fetch(finalUrl)
    if (response.ok) {
      imageSource = Buffer.from(await response.arrayBuffer())
    }
  } catch (err) {
    console.error('[WELCOME PLUGIN] Falló fetch de API de bienvenida, usando respaldo.')
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length + 1
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
    profileUrl = 'https://i.imgur.com/0mYNUYR.png'
  }

  const params = {
    width: 1000,
    height: 500,
    backgroundUrl: 'https://u.pone.rs/pjyqbqyl.jpg',
    profileUrl: profileUrl,
    profileSize: 200,
    profileX: 500,
    profileY: 200,
    borderColor: '#03138c',
    borderWidth: 8,
    text1: `Adiós ${targetNumber}`,
    text1Size: 65,
    text1Color: '#ff0000',
    text1X: 500,
    text1Y: 350,
    text2: 'No vuelvas',
    text2Size: 40,
    text2Color: '#ff0000',
    text2X: 500,
    text2Y: 430,
    apiKey: API_KEY
  }

  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  const finalUrl = `${API_BASE}?${query}`

  let imageSource = 'https://u.pone.rs/pjyqbqyl.jpg'
  try {
    const response = await fetch(finalUrl)
    if (response.ok) {
      imageSource = Buffer.from(await response.arrayBuffer())
    }
  } catch (err) {
    console.error('[WELCOME PLUGIN] Falló fetch de API de despedida, usando respaldo.')
  }

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length - 1
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
      const messageOptions = { caption, mentions, contextInfo }
      if (Buffer.isBuffer(imageSource)) {
        messageOptions.image = imageSource
      } else {
        messageOptions.image = { url: imageSource }
      }
      await conn.sendMessage(m.chat, messageOptions, { quoted: null })
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando bienvenida:', err)
    }
  }

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE || m.messageStubType == 28 || m.messageStubType == 32) {
    try {
      const { imageSource, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })
      const messageOptions = { caption, mentions, contextInfo }
      if (Buffer.isBuffer(imageSource)) {
        messageOptions.image = imageSource
      } else {
        messageOptions.image = { url: imageSource }
      }
      await conn.sendMessage(m.chat, messageOptions, { quoted: null })
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando despedida:', err)
    }
  }
}

export default handler
