import { WAMessageStubType } from '@whiskeysockets/baileys'

const newsletterJid = '120363423523597117@newsletter'
const newsletterName = '👑 SHADOW-BOT-MD| ᴄʜᴀɴɴᴇʟ-ʙᴏᴛ 🌌'
const packname = 'shadow-BOT-MD'

const iconos = [
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165065152-94d843.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165081580-660d44.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165160074-de0e81.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165128396-b5e568.jpg',
]

const getRandomIcono = () => iconos[Math.floor(Math.random() * iconos.length)]

let handler = m => m

handler.before = async function (m, { conn, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.welcome) return !0

  const userId = m.messageStubParameters[0]
  const userJid = userId.includes('@') ? userId : `${userId}@s.whatsapp.net`
  const styledName = conn.getName(userJid) || 'Usuario'
  const pp = await conn.profilePictureUrl(userJid, 'image').catch(() => 'https://files.catbox.moe/gbp5x3.jpg')
  const groupName = groupMetadata.subject
  const groupSize = groupMetadata.participants.length
  const fecha = new Date().toLocaleDateString("es-ES", { timeZone: "America/Santo_Domingo", day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {
    const welcomeApi = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(styledName)}&text2=Bienvenido+a+${encodeURIComponent(groupName)}&text3=Miembro+${groupSize}&avatar=${encodeURIComponent(pp)}`

    let caption = chat.welcomeText ? chat.welcomeText.replace(/@user/g, styledName).replace(/@subject/g, groupName).replace(/@desc/g, desc) : 
    `╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐈𝐍𝐈𝐂𝐈𝐎 」─╮\n\n*${styledName}* ha sido convocado por las sombras...\nBienvenid@ al dominio secreto de *${groupName}*.\n\nTu llegada no es casual. Cada paso será observado.\nTu poder será forjado en silencio. Tu lealtad, puesta a prueba.\n\n╰─「 🌌 𝐈𝐍𝐅𝐎 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 」─╯\n🧿 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n📜 Descripción:\n${desc}\n\n> Usa *#setwelcome* para personalizar este mensaje.`

    await conn.sendMessage(m.chat, { 
      image: { url: welcomeApi }, 
      caption: caption,
      mentions: [userJid],
      contextInfo: {
        externalAdReply: {
          title: 'Welcome to Shadow Garden',
          body: packname,
          thumbnailUrl: getRandomIcono(),
          mediaType: 1,
          showAdAttribution: true
        }
      }
    }, { quoted: null })
  }

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE) {
    const goodbyeApi = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(styledName)}&text2=Se+fue+de+${encodeURIComponent(groupName)}&text3=Adiós+Sombra&avatar=${encodeURIComponent(pp)}`

    let caption = chat.byeText ? chat.byeText.replace(/@user/g, styledName).replace(/@subject/g, groupName) : 
    `╭─「 🌌 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐑𝐄𝐓𝐈𝐑𝐀𝐃𝐀 」─╮\n\n*${styledName}* ha abandonado el círculo de las sombras.\nSu presencia se desvanece... como todo lo que no deja huella.\n\nGrupo: *${groupName}*\n\nQue su memoria permanezca en silencio.\nLas sombras no olvidan, pero tampoco lloran.\n\n╰─「 🌌 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐂𝐓𝐔𝐀𝐋 」─╯\n📉 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n\n> Usa *#setbye* para personalizar este mensaje.`

    await conn.sendMessage(m.chat, { 
      image: { url: goodbyeApi }, 
      caption: caption,
      mentions: [userJid],
      contextInfo: {
        externalAdReply: {
          title: 'Farewell from Shadow Garden',
          body: packname,
          thumbnailUrl: getRandomIcono(),
          mediaType: 1,
          showAdAttribution: true
        }
      }
    }, { quoted: null })
  }
}

export default handler
