import fs from 'fs'
import fetch from 'node-fetch'
import { WAMessageStubType } from '@whiskeysockets/baileys'

const API_BASE = 'https://yosoyyo-api-ofc.onrender.com/api/image/welcome-banner'
const API_KEY = 'Andresv27728'

const YOSOYYO_WELCOME_BANNER = {
  status: 200,
  api_name: 'YOSOYYO',
  tool: 'welcome_banner_generator',
  message: 'Imagen generada con éxito.',
  creator: 'YO SOY YO',
  data: {
    width: 1000,
    height: 500,
    backgroundUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&h=500&q=80',
    profileUrl: 'https://unavatar.io/github/yosue891',
    profileSize: 200,
    profileX: 500,
    profileY: 200,
    borderColor: '#03138c',
    borderWidth: 8,
    texts: [
      { text: 'Bienvenido Usuario', x: 500, y: 350, size: 50, color: '#ffffff', font: 'Arial', bold: true, align: 'center' },
      { text: 'Disfruta tu estancia', x: 500, y: 420, size: 30, color: '#ffffff', font: 'Arial', bold: false, align: 'center' }
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
  const caption = `❀ Bienvenido a *"_${groupName}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n૮꒰ ˶• ᴗ •˶꒱a Disfruta tu estadía en el grupo!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  
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
    backgroundUrl: 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/f1daa4-1770608515673.jpg',
    profileUrl: profileUrl,
    profileSize: 200,
    profileX: 500,
    profileY: 200,
    borderColor: '#03138c',
    borderWidth: 8,
    text1: `Adiós ${targetNumber}`,
    text1Size: 50,
    text1Color: '#ffffff',
    text1X: 500,
    text1Y: 350,
    text2: 'No vuelvas',
    text2Size: 30,
    text2Color: '#ffffff',
    text2X: 500,
    text2Y: 420,
    apiKey: API_KEY
  }

  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  const finalUrl = `${API_BASE}?${query}`

  let imageSource = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/f1daa4-1770608515673.jpg'
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
  const caption = `❀ Adiós de *"_${groupName}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n(˶˃⤙˂˶) Te esperamos pronto!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  
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

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD || m.messageStubType == 27 || m.messageStubType == 31) {
    try {
      const { imageSource, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })
      const messageOptions = { caption, mentions }
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
      const messageOptions = { caption, mentions }
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
