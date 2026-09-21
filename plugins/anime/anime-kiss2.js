import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
  const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

  const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);m.react('🏳️‍🌈')

  let str
  if (hayMencion) {
    str = `\`${name2}\` *beso excitantemente a* \`${name}\`.`
  } else if (via === 'quoted') {
    str = `\`${name2}\` *beso apasionado a* \`${name}\`.`
  } else {
    str = `\`${name2}\` *se besa a sí mismo porque es un rolo de gay XD.*`.trim()
  }

  if (m.isGroup) {
    try {
      await enviarReaccionAnime(conn, m, { reaccion: 'kiss', caption: str, mentions: [who] })
    } catch (e) {
      console.error('[anime-kiss2] no se pudo enviar el GIF:', e.message)
      await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m })
    }
  }
}

handler.help = ['kiss2', 'besar2 @tag']
handler.tags = ['anime']
handler.command = ['kiss2', 'besar2']
handler.group = true

export default handler
