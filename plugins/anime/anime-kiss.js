import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

    const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);
    m.react('🫦');

    let str;
    if (hayMencion) {
        str = `\`${name2}\` *Le dio besos a* \`${name}\` *( ˘ ³˘)♥*.`;
    } else if (via === 'quoted') {
        str = `\`${name2}\` *beso a* \`${name}\` 💋.`;
    } else {
        str = `\`${name2}\` *se besó a sí mismo ( ˘ ³˘)♥*`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'kiss', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-kiss] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['kiss/besar @tag'];
handler.tags = ['anime'];
handler.command = ['kiss','besar'];
handler.group = true;

export default handler;
