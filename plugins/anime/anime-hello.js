import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
  try {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args })
    const hayMencion = hasMention || via === 'mention' || via === 'text'
    const name = await nombreSeguro(conn, who)
    const name2 = await nombreSeguro(conn, m.sender)

    await conn.sendMessage(m.chat, { react: { text: '👋', key: m.key } })

    let caption
    if (hayMencion) {
      caption = `\`${name2}\` *hola* \`${name}\` *¿cómo estás?*`
    } else if (via === 'quoted') {
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
