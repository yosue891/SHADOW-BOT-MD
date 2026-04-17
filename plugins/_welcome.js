import { WAMessageStubType } from '@whiskeysockets/baileys'

const packname = 'shadow-BOT-MD'

const participantCache = {}

function resolvePhoneJid(raw = '') {
  if (!raw) return ''
  const stripped = raw.replace(/@.*/, '').replace(/\D/g, '')
  return stripped ? `${stripped}@s.whatsapp.net` : ''
}

function resolveUserJid(rawId, participants, groupId) {
  const found = participants.find(p => p.id === rawId || p.lid === rawId || p.jid === rawId)
  if (found) {
    const phoneSource = found.phoneNumber || found.pn || found.jid || ''
    if (phoneSource && !phoneSource.endsWith('@lid')) return resolvePhoneJid(phoneSource)
  }
  const cached = participantCache[groupId]?.[rawId]
  if (cached) return cached
  if (!rawId.endsWith('@lid')) return rawId.includes('@') ? rawId : `${rawId}@s.whatsapp.net`
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

  if (userJid.endsWith('@lid')) return !0

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
  const groupDesc = groupMetadata.desc?.toString() || 'Sin descripción'
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  if (m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_ADD) {

    const welcomeImg = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Bienvenido+a+${encodeURIComponent(groupName)}&text3=Miembro+${groupSize}&avatar=${encodeURIComponent(pp)}`

    const caption = 
`╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐈𝐍𝐈𝐂𝐈𝐎 」─╮

${userName} ha sido convocado por las sombras...
Bienvenid@ al dominio secreto de ${groupName}.

Tu llegada no es casual. Cada paso será observado.
Tu poder será forjado en silencio. Tu lealtad, puesta a prueba.

⚠️ Lee las reglas para no ser expulsado por las sombras, @${userTag}

╰─「 🌌 𝐈𝐍𝐅𝐎 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 」─╯
🧿 Miembros: ${groupSize}
📅 Fecha: ${fecha}

📜 Descripción:
${groupDesc}`

    await conn.sendMessage(m.chat, {
      image: { url: welcomeImg },
      caption,
      footer: `© ${packname} · Welcome`,
      buttons: [
        { buttonId: '#reg', buttonText: { displayText: '👤 Registrarme' }, type: 1 },
        { buttonId: '#menu', buttonText: { displayText: '🌌 Menú' }, type: 1 }
      ],
      mentions: [userJid],
      viewOnce: true,
      contextInfo: {
        externalAdReply: {
          title: '─ W E L C O M E ─🥷🏻',
          body: `Bienvenido a ${groupName}`,
          thumbnailUrl: pp,
          mediaType: 1,
          showAdAttribution: true,
          sourceUrl: 'https://wa.me/584242773183'
        }
      }
    })
  }

  if (
    m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_REMOVE ||
    m.messageStubType == WAMessageStubType.GROUP_PARTICIPANT_LEAVE
  ) {

    const goodbyeImg = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent('https://files.catbox.moe/gbp5x3.jpg')}&text1=${encodeURIComponent(userName)}&text2=Se+fue+de+${encodeURIComponent(groupName)}&text3=Adiós+Sombra&avatar=${encodeURIComponent(pp)}`

    const caption = 
`╭─「 🌌 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐑𝐄𝐓𝐈𝐑𝐀𝐃𝐀 」─╮

${userName} ha abandonado el círculo de las sombras.
Su presencia se desvanece... como todo lo que no deja huella.

Grupo: ${groupName}

Que su memoria permanezca en silencio.
Las sombras no olvidan, pero tampoco lloran.

╰─「 🌌 𝐄𝐒𝐓𝐀𝐃𝐎 𝐀𝐂𝐓𝐔𝐀𝐋 」─╯
📉 Miembros: ${groupSize}
📅 Fecha: ${fecha}

📜 Descripción:
${groupDesc}`

    await conn.sendMessage(m.chat, {
      image: { url: goodbyeImg },
      caption,
      footer: `© ${packname} · Goodbye`,
      buttons: [
        { buttonId: '#reg', buttonText: { displayText: '👤 Registrarme' }, type: 1 },
        { buttonId: '#menu', buttonText: { displayText: '🌌 Menú' }, type: 1 }
      ],
      mentions: [userJid],
      viewOnce: true,
      contextInfo: {
        externalAdReply: {
          title: '─Ａ Ｄ Ｉ Ō S─👋🏻',
          body: `Se fue de ${groupName}`,
          thumbnailUrl: pp,
          mediaType: 1,
          showAdAttribution: true,
          sourceUrl: 'https://wa.me/584242773183'
        }
      }
    })
  }
}

export default handler
