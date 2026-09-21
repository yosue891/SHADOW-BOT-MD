import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

    const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);
    m.react('😏');

    let str;
    if (hayMencion) {
        str = `\`${name2}\` *esta seduciendo a* \`${name}\`.`;
    } else if (via === 'quoted') {
        str = `\`${name2}\` *está seduciendo a*  \`${name}\` *( ͡° ͜ʖ ͡°)*.`;
    } else {
        str = `\`${name2}\` *está seduciendo ( ͡° ͜ʖ ͡°).*`.trim();
    }
    
    if (m.isGroup) { 
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'seduce', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-seduce] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['seduce/seducir @tag'];
handler.tags = ['anime'];
handler.command = ['seduce','seducir'];
handler.group = true;

export default handler;
