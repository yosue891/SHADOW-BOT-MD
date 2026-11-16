import { WAMessageStubType } from '@whiskeysockets/baileys'

function cleanJid(val) {
  if (!val) return ''
  if (typeof val === 'object') {
    val = val.phoneNumber || val.id || val.jid || val.lid || ''
  }
  if (typeof val === 'string') {
    let str = val.trim()
    if ((str.startsWith('{') && str.endsWith('}')) || str.includes('"id":')) {
      try {
        const parsed = JSON.parse(str)
        return cleanJid(parsed)
      } catch {
        const match = str.match(/"?id"?\s*:\s*"([^"\r\n}]+)/i)
        if (match) str = match[1]
      }
    }
    str = str.replace(/^["'\s{]+|["'\s}]+$/g, '')
    val = str
  }
  return String(val || '').trim()
}

const handler = m => m
handler.before = async function (m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup || m.messageStubType === WAMessageStubType.CIPHERTEXT) return

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.detect) return

  const primaryBot = chat.primaryBot
  if (primaryBot && conn.user.jid !== primaryBot) throw !1

  const senderRaw = cleanJid(m?.sender || m?.participant || m?.key?.participant || '')
  const senderParticipant = Array.isArray(participants) ? participants.find(p =>
    [p.id, p.lid, p.jid, p.phoneNumber]
      .filter(Boolean)
      .some(j => j === senderRaw || j.split('@')[0] === senderRaw.split('@')[0])
  ) : null

  const usuario = senderParticipant?.phoneNumber
    ? `${senderParticipant.phoneNumber}@s.whatsapp.net`
    : (senderParticipant?.jid || (senderParticipant?.id && senderParticipant.id.endsWith('@s.whatsapp.net') ? senderParticipant.id : senderRaw))
  const usuarioNumber = usuario ? usuario.split('@')[0].split(':')[0].replace(/\D/g, '') : ''
  const actorMention = usuarioNumber ? `@${usuarioNumber}` : (usuario ? `@${usuario.split('@')[0]}` : 'un administrador')

  const groupAdmins = Array.isArray(participants) ? participants.filter(p => p.admin) : []

  const rcanalBase = {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: {
      newsletterJid: global.channelRD?.id || '',
      serverMessageId: '',
      newsletterName: global.channelRD?.name || ''
    },
    matchedText: ""
  }

  const pp = await conn.profilePictureUrl(m.chat, 'image').catch(_ => null) || 'https://raw.githubusercontent.com/yosue891/Shadow-MD/refs/heads/main/Screenshot%202026-06-09%2016.03.08%20(1).png'

  const nombre = `> ❀ ${actorMention} Ha cambiado el nombre del grupo.\n> ✦ Ahora el grupo se llama:\n> *${m.messageStubParameters?.[0] || ''}*.`
  const foto = `> ❀ Se ha cambiado la imagen del grupo.\n> ✦ Acción hecha por:\n> » ${actorMention}`
  const edit = `> ❀ ${actorMention} Ha permitido que ${m.messageStubParameters?.[0] == 'on' ? 'solo admins' : 'todos'} puedan configurar el grupo.`
  const newlink = `> ❀ El enlace del grupo ha sido restablecido.\n> ✦ Acción hecha por:\n> » ${actorMention}`
  const status = `> ❀ El grupo ha sido ${m.messageStubParameters?.[0] == 'on' ? '*cerrado*' : '*abierto*'} Por ${actorMention}\n> ✦ Ahora ${m.messageStubParameters?.[0] == 'on' ? '*solo admins*' : '*todos*'} pueden enviar mensaje.`

  // Extraer participantes objetivo para acciones de administración (promote / demote)
  const rawTargets = Array.isArray(m.messageStubParameters) && m.messageStubParameters.length
    ? m.messageStubParameters
    : (m.messageStubParameters ? [m.messageStubParameters] : [])

  const targetData = rawTargets.map(raw => {
    const clean = cleanJid(raw)
    const p = Array.isArray(participants) ? participants.find(part =>
      [part.id, part.lid, part.jid, part.phoneNumber]
        .filter(Boolean)
        .some(j => j === clean || j.split('@')[0] === clean.split('@')[0])
    ) : null
    const jid = p?.phoneNumber
      ? `${p.phoneNumber}@s.whatsapp.net`
      : (p?.id && p.id.endsWith('@s.whatsapp.net') ? p.id : (p?.jid || (clean.includes('@') ? clean : (clean ? `${clean}@s.whatsapp.net` : ''))))
    const number = jid ? jid.split('@')[0].split(':')[0].replace(/\D/g, '') : (clean ? clean.split('@')[0].split(':')[0].replace(/\D/g, '') : '')
    return { raw, clean, jid, number, id: p?.id, lid: p?.lid }
  }).filter(t => t.clean || t.number)

  const targetText = targetData.map(t => `@${t.number}`).filter(Boolean).join(', ') || 'un usuario'

  const admingp = `> ❀ ${targetText} Ahora ${targetData.length > 1 ? 'son admins' : 'es admin'} del grupo.\n> ✦ Acción hecha por:\n> » ${actorMention}`
  const noadmingp = `> ❀ ${targetText} Deja de ser admin del grupo.\n> ✦ Acción hecha por:\n> » ${actorMention}`

  const baseMentions = [usuario, senderRaw, ...groupAdmins.map(v => v.id)].filter(Boolean)
  const adminMentions = Array.from(new Set([
    ...baseMentions,
    ...targetData.flatMap(t => [t.jid, t.clean, t.id, t.lid])
  ].filter(j => typeof j === 'string' && j.includes('@') && !j.includes('{') && !j.includes('"'))))

  if (m.messageStubType == 21) {
    await this.sendMessage(m.chat, { text: nombre, contextInfo: { ...rcanalBase, mentionedJid: baseMentions } }, { quoted: null })
  } else if (m.messageStubType == 22) {
    const rcanalFoto = { ...rcanalBase }
    delete rcanalFoto.matchedText
    await this.sendMessage(m.chat, { image: { url: pp }, caption: foto, contextInfo: { ...rcanalFoto, mentionedJid: baseMentions } }, { quoted: null })
  } else if (m.messageStubType == 23) {
    await this.sendMessage(m.chat, { text: newlink, contextInfo: { ...rcanalBase, mentionedJid: baseMentions } }, { quoted: null })
  } else if (m.messageStubType == 25) {
    await this.sendMessage(m.chat, { text: edit, contextInfo: { ...rcanalBase, mentionedJid: baseMentions } }, { quoted: null })
  } else if (m.messageStubType == 26) {
    await this.sendMessage(m.chat, { text: status, contextInfo: { ...rcanalBase, mentionedJid: baseMentions } }, { quoted: null })
  } else if (m.messageStubType == 29) {
    await this.sendMessage(m.chat, { text: admingp, contextInfo: { ...rcanalBase, mentionedJid: adminMentions } }, { quoted: null })
    return
  } else if (m.messageStubType == 30) {
    await this.sendMessage(m.chat, { text: noadmingp, contextInfo: { ...rcanalBase, mentionedJid: adminMentions } }, { quoted: null })
    return
  } else { 
    if (m.messageStubType == 2) return
    console.log({
      messageStubType: m.messageStubType,
      messageStubParameters: m.messageStubParameters,
      type: WAMessageStubType[m.messageStubType], 
    })
  }
}

export default handler
