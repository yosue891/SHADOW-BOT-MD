import fs from 'fs'
import { WAMessageStubType } from '@whiskeysockets/baileys'

const newsletterJid = '120363423523597117@newsletter'
const newsletterName = '👑 SHADOW-BOT-MD| ᴄʜᴀɴɴᴇʟ-ʙᴏᴛ 🌌'
const packname = 'shadow-BOT-MD'

const welcomeBannerData = {
  backgroundUrl: "https://files.catbox.moe/gbp5x3.jpg",
}

// Función para el texto en WhatsApp (con adornos)
function estilizarNombre(nombre) {
  return `『 ${nombre} 』`
}

async function generarBienvenida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = await conn.profilePictureUrl(userId, 'image').catch(() =>
    'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1745522645448.jpeg'
  )
  const fecha = new Date().toLocaleDateString("es-ES", {
    timeZone: "America/Santo_Domingo",
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const groupSize = groupMetadata.participants.length + 1
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'

  let caption
  if (chat.welcomeText) {
    caption = chat.welcomeText
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject)
      .replace(/@desc/g, desc)
  } else {
    caption = `╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐈𝐍𝐈𝐂𝐈𝐎 」─╮\n\n@user ha sido convocado por las sombras...\nBienvenid@ al dominio secreto de *@subject*.\n\nTu llegada no es casual. Cada paso será observado.\nTu poder será forjado en silencio. Tu lealtad, puesta a prueba.\n\n╰─「 🌌 𝐈𝐍𝐅𝐎 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 」─╯\n🧿 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n📜 Descripción:\n${desc}\n\n> Usa *#setwelcome* para personalizar este mensaje.`
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject)
  }

  return { pp, caption, mentions: [userId], username }
}

async function generarDespedida({ conn, userId, groupMetadata, chat }) {
  const username = `@${userId.split('@')[0]}`
  const pp = await conn.profilePictureUrl(userId, 'image').catch(() =>
    'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165081580-660d44.jpg'
  )
  const fecha = new Date().toLocaleDateString("es-ES", {
    timeZone: "America/Santo_Domingo",
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const groupSize = groupMetadata.participants.length - 1

  let caption
  if (chat.byeText) {
    caption = chat.byeText
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject)
  } else {
    caption = `╭─「 🌌 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐑𝐄𝐓𝐈𝐑𝐀𝐃𝐀 」─╮\n\n@user ha abandonado el círculo de las sombras.\nSu presencia se desvanece... como todo lo que no deja huella.\n\nGrupo: *@subject*\n\nQue su memoria permanezca en silencio.\nLas sombras no olvidan, pero tampoco lloran.\n\n╰─「 🌌 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐂𝐓𝐔𝐀𝐋 」─╯\n📉 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n\n> Usa *#setbye* para personalizar este mensaje.`
      .replace(/@user/g, username)
      .replace(/@subject/g, groupMetadata.subject)
  }

  return { pp, caption, mentions: [userId], username }
}

let handler = m => m

handler.before = async function (m, { conn, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0

  const chat = global.db.data.chats[m.chat]
  if (!chat) return !0

  const userId = m.messageStubParameters[0]
  
  // Obtenemos el nombre real de WhatsApp
  const realName = await conn.getName(userId)
  const styledName = estilizarNombre(realName) // Para el texto del mensaje
  const cleanName = realName.replace(/[^\x00-\x7F]/g, "") || "Usuario" // Nombre limpio para la imagen (evita cuadros con X)

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'ShadowBot' },
    message: { contactMessage: { displayName: packname, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${packname}\nEND:VCARD` } }
  }

  // LÓGICA DE BIENVENIDA
  if (chat.welcome && m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {
    const { pp, caption, mentions } = await generarBienvenida({ conn, userId, groupMetadata, chat })

    // Aquí construimos la URL usando cleanName en lugar de texto estático
    const welcomeImg = `https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?title=${encodeURIComponent('BIENVENIDO')}&desc=${encodeURIComponent(cleanName)}&profile=${encodeURIComponent(pp)}&background=${encodeURIComponent(welcomeBannerData.backgroundUrl)}`

    await conn.sendMessage(m.chat, {
      product: {
        productImage: { url: welcomeImg },
        productId: 'shadow-welcome',
        title: '─ W E L C O M E ─ 🌌',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 777,
        productImageCount: 1
      },
      caption: caption.replace(/『.*?』/g, styledName), // Asegura que el nombre estilizado vaya al texto
      footer: `© ${packname} · Welcome`,
      mentions
    }, { quoted: fkontak })
  }

  // LÓGICA DE DESPEDIDA
  if (chat.welcome && (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE)) {
    const { pp, caption, mentions } = await generarDespedida({ conn, userId, groupMetadata, chat })

    const goodbyeImg = `https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave?title=${encodeURIComponent('ADIOS')}&desc=${encodeURIComponent(cleanName)}&profile=${encodeURIComponent(pp)}&background=${encodeURIComponent(welcomeBannerData.backgroundUrl)}`

    await conn.sendMessage(m.chat, {
      product: {
        productImage: { url: goodbyeImg },
        productId: 'shadow-goodbye',
        title: '─ Ａ Ｄ Ｉ Ó Ｓ ─ 👋🏻',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 777,
        productImageCount: 1
      },
      caption: caption.replace(/『.*?』/g, styledName),
      footer: `© ${packname} · Goodbye`,
      mentions
    }, { quoted: fkontak })
  }
}

export { generarBienvenida, generarDespedida }
export default handler
