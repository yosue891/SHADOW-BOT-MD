import { WAMessageStubType } from '@whiskeysockets/baileys'

const packname = 'shadow-BOT-MD'
const iconos = [
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165065152-94d843.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165081580-660d44.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165160074-de0e81.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165128396-b5e568.jpg',
]

const getRandomIcono = () => iconos[Math.floor(Math.random() * iconos.length)]

let handler = m => m

handler.before = async function (m, { conn, groupMetadata, usedPrefix }) {
  if (!m.messageStubType || !m.isGroup) return !0

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.welcome) return !0

  const rawId = m.messageStubParameters[0]
  const userJid = rawId.includes('@') ? rawId : `${rawId}@s.whatsapp.net`
  const userTag = userJid.split('@')[0]
  const userName = conn.getName(userJid) || userTag
  
  let pp
  try {
    pp = await conn.profilePictureUrl(userJid, 'image')
  } catch {
    pp = 'https://files.catbox.moe/gbp5x3.jpg'
  }

  const groupName = groupMetadata.subject
  const groupSize = groupMetadata.participants.length
  const fecha = new Date().toLocaleDateString('es-ES')

  // --- FKONTAK ESTILO SHADOW ---
  const fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'ShadowWelcome' },
    message: {
      contactMessage: {
        displayName: userName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${userName}\nEND:VCARD`
      }
    }
  }

  // --- BIENVENIDA (ESTILO PRODUCTO + BOTONES) ---
  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {
    const welcomeImg = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Bienvenido+a+${encodeURIComponent(groupName)}&text3=Miembro+${groupSize}&avatar=${encodeURIComponent(pp)}`

    await conn.sendMessage(m.chat, {
      product: {
        productImage: { url: welcomeImg },
        productId: 'welcome-001',
        title: '─ W E L C O M E ─🥷🏻',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 1677,
        productImageCount: 1
      },
      businessOwnerJid: '0@s.whatsapp.net',
      caption: `*Bienvenido/a al grupo*\n\n> Usuario: @${userTag}\n> Miembros: ${groupSize}\n> Fecha: ${fecha}`,
      footer: `© ${packname} · Shadow Garden`,
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: '👤 Registrarme', id: `#reg ${userName}.18` })
        }
      ],
      mentions: [userJid]
    }, { quoted: fkontak })
  }

  // --- DESPEDIDA (ESTILO PRODUCTO + BOTONES) ---
  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE) {
    const goodbyeImg = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Se+fue+de+${encodeURIComponent(groupName)}&text3=Adiós+Sombra&avatar=${encodeURIComponent(pp)}`

    await conn.sendMessage(m.chat, {
      product: {
        productImage: { url: goodbyeImg },
        productId: 'goodbye-001',
        title: '─ Ａ Ｄ Ｉ Ｏ Ｓ ─👋🏻',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 1677,
        productImageCount: 1
      },
      businessOwnerJid: '0@s.whatsapp.net',
      caption: `*El usuario salió del grupo*\n\n> Usuario: @${userTag}\n> Fecha: ${fecha}`,
      footer: `© ${packname} · Shadow Garden`,
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: '👤 Registrarme', id: `#reg ${userName}.18` })
        }
      ],
      mentions: [userJid]
    }, { quoted: fkontak })
  }
}

export default handler
