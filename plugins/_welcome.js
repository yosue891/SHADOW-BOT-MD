import { WAMessageStubType } from '@whiskeysockets/baileys'

const packname = 'shadow-BOT-MD'

const iconos = [
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165065152-94d843.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165081580-660d44.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165160074-de0e81.jpg',
  'https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763165128396-b5e568.jpg',
]

const getRandomIcono = () => iconos[Math.floor(Math.random() * iconos.length)]

const participantCache = {}

function resolvePhoneJid(raw = '') {
  if (!raw) return ''
  const stripped = raw.replace(/@.*/, '').replace(/\D/g, '')
  return stripped ? `${stripped}@s.whatsapp.net` : ''
}

function resolveUserJid(rawId, participants, groupId) {
  const found = participants.find(p =>
    p.id === rawId || p.lid === rawId || p.jid === rawId
  )

  if (found) {
    const phoneSource = found.phoneNumber || found.pn || found.jid || ''
    if (phoneSource && !phoneSource.endsWith('@lid')) {
      return resolvePhoneJid(phoneSource)
    }
  }

  const cached = participantCache[groupId]?.[rawId]
  if (cached) return cached

  if (!rawId.endsWith('@lid')) {
    return rawId.includes('@') ? rawId : `${rawId}@s.whatsapp.net`
  }

  return rawId
}

function cacheParticipants(groupId, participants = []) {
  if (!participantCache[groupId]) participantCache[groupId] = {}
  for (const p of participants) {
    const phoneJid = resolvePhoneJid(p.phoneNumber || p.pn || p.jid || '')
    if (!phoneJid) continue
    if (p.lid) participantCache[groupId][p.lid] = phoneJid
    if (p.id) participantCache[groupId][p.id] = phoneJid
    if (p.jid) participantCache[groupId][p.jid] = phoneJid
  }
}

let handler = m => m

handler.before = async function (m, { conn, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0

  if (groupMetadata?.participants?.length) {
    cacheParticipants(m.chat, groupMetadata.participants)
  }

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.welcome) return !0

  const rawId = m.messageStubParameters[0]
  const userJid = resolveUserJid(rawId, groupMetadata.participants, m.chat)

  if (userJid.endsWith('@lid')) {
    console.warn('[welcome] No se pudo resolver JID real para:', rawId)
    return !0
  }

  const userTag = userJid.split('@')[0]
  const userName = conn.getName(userJid) || userTag
  const pp = await conn.profilePictureUrl(userJid, 'image').catch(() => 'https://files.catbox.moe/gbp5x3.jpg')
  const groupName = groupMetadata.subject
  const groupSize = groupMetadata.participants.length
  const fecha = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Santo_Domingo', day: 'numeric', month: 'long', year: 'numeric' })
  const desc = groupMetadata.desc?.toString() || 'Sin descripción'

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {
    const welcomeApi = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Bienvenido+a+${encodeURIComponent(groupName)}&text3=Miembro+${groupSize}&avatar=${encodeURIComponent(pp)}`

    const caption = chat.welcomeText
      ? chat.welcomeText.replace(/@subject/g, groupName).replace(/@desc/g, desc).replace(/@user/g, `@${userTag}`)
      : `╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐈𝐍𝐈𝐂𝐈𝐎 」─╮\n\n${userName} ha sido convocado por las sombras...\nBienvenid@ al dominio secreto de *${groupName}*.\n\nTu llegada no es casual. Cada paso será observado.\nTu poder será forjado en silencio. Tu lealtad, puesta a prueba.\n\n╰─「 🌌 𝐈𝐍𝐅𝐎 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 」─╯\n🧿 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n📜 Descripción:\n@user\n\n> Usa *#setwelcome* para personalizar este mensaje.`

    await conn.sendMessage(m.chat, {
      image: { url: welcomeApi },
      caption,
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
    const goodbyeApi = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Se+fue+de+${encodeURIComponent(groupName)}&text3=Adiós+Sombra&avatar=${encodeURIComponent(pp)}`

    const caption = chat.byeText
      ? chat.byeText.replace(/@subject/g, groupName).replace(/@user/g, `@${userTag}`)
      : `╭─「 🌌 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐑𝐄𝐓𝐈𝐑𝐀𝐃𝐀 」─╮\n\n${userName} ha abandonado el círculo de las sombras.\nSu presencia se desvanece... como todo lo que no deja huella.\n\nGrupo: *${groupName}*\n\nQue su memoria permanezca en silencio.\nLas sombras no olvidan, pero tampoco lloran.\n\n╰─「 🌌 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐂𝐓𝐔𝐀𝐋 」─╯\n📉 Miembros: ${groupSize}\n📅 Fecha: ${fecha}\n📜 Descripción:\n@user\n\n> Usa *#setbye* para personalizar este mensaje.`

    await conn.sendMessage(m.chat, {
      image: { url: goodbyeApi },
      caption,
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
