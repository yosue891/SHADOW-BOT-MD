import { enviarReaccionAnime } from '../../lib/anime-media.js'

let handler = async (m, { conn }) => {
  try {
    const getTargetJid = () => {
      if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0]
      if (m.quoted && m.quoted.sender) return m.quoted.sender
      const match = (m.text || '').match(/@(\d{5,})/)
      if (match) return `${match[1]}@s.whatsapp.net`
      return m.sender
    }

    const who = getTargetJid()

    const safeName = async (jid) => {
      try {
        const n = await conn.getName(jid)
        return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
      } catch {
        return jid.split('@')[0]
      }
    }

    const name = await safeName(who)
    const name2 = await safeName(m.sender)

    await conn.sendMessage(m.chat, { react: { text: '👋', key: m.key } })

    let caption
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      caption = `\`${name2}\` *hola* \`${name}\` *¿cómo estás?*`
    } else if (m.quoted) {
      caption = `\`${name2}\` *hola* \`${name}\` *¿cómo te encuentras hoy?*`
    } else {
      caption = `\`${name2}\` *saluda a todos los integrantes del grupo, ¿cómo se encuentran?*`
    }

    const mentions = who ? [who] : []
    await enviarReaccionAnime(conn, m, { reaccion: 'hi', caption, mentions })
  } catch (err) {
    await conn.sendMessage(m.chat, { text: `☽ Error en hola: ${err.message}` }, { quoted: m })
  }
}

handler.help = ['hello/hola @tag']
handler.tags = ['anime']
handler.command = ['hello', 'hola']
handler.group = true

export default handler
