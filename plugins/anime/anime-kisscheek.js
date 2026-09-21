import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

    const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);
    m.react('❤️');

    let str;
    if (hayMencion) {
        str = `\`${name2}\` *le dio un beso en la mejilla a* \`${name}\` 😊💖.`;
    } else if (via === 'quoted') {
        str = `\`${name2}\` *besó en la mejilla a* \`${name}\` 💕.`;
    } else {
        str = `\`${name2}\` *se besó a sí mismo en la mejilla 😊*`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'kisscheek', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-kisscheek] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['kisscheek @tag'];
handler.tags = ['anime'];
handler.command = ['kisscheek'];
handler.group = true;

export default handler;
