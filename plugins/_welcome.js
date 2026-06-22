import fs from 'fs'
import { WAMessageStubType } from '@whiskeysockets/baileys'

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
      {
        text: 'Bienvenido Usuario',
        x: 500,
        y: 350,
        size: 50,
        color: '#ffffff',
        font: 'Arial',
        bold: true,
        align: 'center'
      },
      {
        text: 'Disfruta tu estancia',
        x: 500,
        y: 420,
        size: 30,
        color: '#ffffff',
        font: 'Arial',
        bold: false,
        align: 'center'
      }
    ]
  }
}

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = YOSOYYO_WELCOME_BANNER.data.backgroundUrl

  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length + 1
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sWelcome || 'Edita con el comando "setwelcome"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `*${groupMetadata.subject}*`).replace(/{desc}/g, `${desc}`)
  const caption = `❀ Bienvenido a *"_${groupMetadata.subject}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n૮꒰ ˶• ᴗ •˶꒱a Disfruta tu estadía en el grupo!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  return { pp, caption, mentions: [userId] }
}

export async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/f1daa4-1770608515673.jpg'
  
  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length - 1
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sBye || 'Edita con el comando "setbye"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `${groupMetadata.subject}`).replace(/{desc}/g, `*${desc}*`)
  const caption = `❀ Adiós de *"_${groupMetadata.subject}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n(˶˃⤙˂˶) Te esperamos pronto!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  return { pp, caption, mentions: [userId] }
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
      const { pp, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })
      await conn.sendMessage(m.chat, { image: { url: pp }, caption, mentions }, { quoted: null })
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando bienvenida:', err)
    }
  }

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE || m.messageStubType == 28 || m.messageStubType == 32) {
    try {
      const { pp, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })
      await conn.sendMessage(m.chat, { image: { url: pp }, caption, mentions }, { quoted: null })
    } catch (err) {
      console.error('[WELCOME PLUGIN] Error enviando despedida:', err)
    }
  }
}

export default handler
