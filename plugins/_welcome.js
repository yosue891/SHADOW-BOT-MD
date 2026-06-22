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
    borderColor: '#37148a',
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
        text: 'las sombras te reciben',
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

function getWelcomeBannerUrl() {
  return YOSOYYO_WELCOME_BANNER.data.backgroundUrl
}

async function getProfileUrl(conn, userId) {
  try {
    return await conn.profilePictureUrl(userId, 'image')
  } catch {
    return 'https://i.imgur.com/JP52fdP.png'
  }
}

const WELCOME_STUB_TYPES = new Set([
  WAMessageStubType.GROUP_PARTICIPANT_ADD,
  WAMessageStubType.GROUP_PARTICIPANT_INVITE,
  WAMessageStubType.GROUP_PARTICIPANT_ACCEPT,
  WAMessageStubType.GROUP_PARTICIPANT_LINKED_GROUP_JOIN,
  WAMessageStubType.GROUP_PARTICIPANT_JOINED_GROUP_AND_PARENT_GROUP,
  WAMessageStubType.SUB_GROUP_PARTICIPANT_ADD_RICH,
  27,
  31,
  140,
  141,
  151,
  166
])

const GOODBYE_STUB_TYPES = new Set([
  WAMessageStubType.GROUP_PARTICIPANT_REMOVE,
  WAMessageStubType.GROUP_PARTICIPANT_LEAVE,
  28,
  32
])

function getStubType(m) {
  return Number(m?.messageStubType)
}

export async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = getWelcomeBannerUrl()
  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length + 1
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sWelcome || 'Edita con el comando "setwelcome"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `*${groupMetadata.subject}*`).replace(/{desc}/g, `${desc}`)
  const caption = `❀ Bienvenido a *"_${groupMetadata.subject}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n૮꒰ ˶• ᴗ •˶꒱ა Disfruta tu estadía en el grupo!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  return { pp, caption, mentions: [userId] }
}

export async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = await getProfileUrl(conn, userId)
  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  const groupSize = groupMetadata.participants.length - 1
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'
  const mensaje = (chat.sBye || 'Edita con el comando "setbye"').replace(/{usuario}/g, `${username}`).replace(/{grupo}/g, `${groupMetadata.subject}`).replace(/{desc}/g, `*${desc}*`)
  const caption = `❀ Adiós de *"_${groupMetadata.subject}_"*\n✰ _Usuario_ » ${username}\n● ${mensaje}\n◆ _Ahora somos ${groupSize} Miembros._\nꕥ Fecha » ${fecha}\n(˶˃⤙˂˶) Te esperamos pronto!\n> *➮ Puedes usar _#help_ para ver la lista de comandos.*`
  return { pp, caption, mentions: [userId] }
}

export async function before(m, { conn, usedPrefix }) {
  if (!m.isGroup) return !0
  if (!m.messageStubType) return !0

  const stubType = getStubType(m)
  
  // Si no es un tipo de evento que nos interese, salimos rápido sin procesar
  if (!WELCOME_STUB_TYPES.has(stubType) && !GOODBYE_STUB_TYPES.has(stubType)) return !0

  // Log para revisar en la consola si el evento está llegando al archivo
  console.log(`[WELCOME PLUGIN] Evento detectado. Tipo: ${stubType} en el grupo: ${m.chat}`)

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat?.welcome) {
    console.log(`[WELCOME PLUGIN] Las bienvenidas están apagadas en este grupo en la base de datos.`)
    return !0
  }

  const primaryBot = chat?.primaryBot
  if (primaryBot && conn.user.jid !== primaryBot) return !1

  const who = m.messageStubParameters?.[0]
  if (!who) return !0

  const taguser = `@${who.split('@')[0]}`
  const botname = global.author || 'Shadow-Bot'

  let metadata = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      metadata = await conn.groupMetadata(m.chat)
      break
    } catch (e) {
      if (e?.data === 429 || e?.output?.statusCode === 429 || e?.message?.includes('rate-overlimit')) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      return !0
    }
  }
  if (!metadata) return !0
  const totalMembers = metadata.participants.length
  const date = new Date().toLocaleDateString('es-ES')

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'Shadow-bot'
    },
    message: {
      contactMessage: {
        displayName: botname,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botname}\nORG:${botname};\nTEL;type=CELL;type=VOICE;waid=0:+0\nEND:VCARD`
      }
    }
  }

  const profile = await getProfileUrl(conn, who)

  if (WELCOME_STUB_TYPES.has(stubType)) {
    const welcomeImg = getWelcomeBannerUrl()
    const welcomeCaption = `\n*Bienvenido/a al grupo*\n\n> Usuario: ${taguser}\n> Miembros totales: ${totalMembers}\n> Fecha: ${date}\n`.trim()

    try {
      await conn.sendMessage(m.chat, { image: { url: welcomeImg }, caption: welcomeCaption, mentions: [who] }, { quoted: fkontak })
      console.log(`[WELCOME PLUGIN] Mensaje de bienvenida enviado con éxito a ${taguser}`)
    } catch (e) {
      console.error('[WELCOME PLUGIN] Error enviando bienvenida con imagen:', e)
      await conn.sendMessage(m.chat, { text: welcomeCaption, mentions: [who] }, { quoted: fkontak }).catch(() => {})
    }
  }

  if (GOODBYE_STUB_TYPES.has(stubType)) {
    const goodbyeImg =
      'https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?' +
      'title=Se+fue+del+grupo' +
      '&desc=No+vuelvas' +
      `&profile=${encodeURIComponent(profile)}` +
      '&background=https%3A%2F%2Fraw.githubusercontent.com%2FEl-brayan502%2Fimg%2Fupload%2Fuploads%2Ff1daa4-1770608515673.jpg'

    await conn.sendMessage(
      m.chat,
      {
        product: {
          productImage: { url: goodbyeImg },
          productId: 'goodbye-001',
          title: '─Ａ Ｄ Ｉ Ō S─👋🏻',
          currencyCode: 'USD',
          priceAmount1000: '0',
          retailId: 1677,
          productImageCount: 1
        },

        businessOwnerJid: '0@s.whatsapp.net',

        caption: `\n> Usuario: ${taguser}\n> Fecha: ${date}\n*salió del grupo.*\n`.trim(),

        footer: `© ${botname} · Goodbye`,

        interactiveButtons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '👤 Registrarme',
              id: `${usedPrefix || '#'}reg user.19`
            })
          }
        ],

        mentions: [who]
      },
      { quoted: fkontak }
    )
    console.log(`[WELCOME PLUGIN] Mensaje de despedida enviado con éxito a ${taguser}`)
  }
}

let handler = m => m
handler.before = before
export default handler
