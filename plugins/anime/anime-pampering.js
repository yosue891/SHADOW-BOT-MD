import fs from 'fs';
import path from 'path';
import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

    const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);
    m.react('🤗');

    let str;
    if (hayMencion) {
        str = `\`${name2}\` *está dando mimos a* \`${name}\`.`;
    } else if (via === 'quoted') {
        str = `\`${name2}\` *está dando mimos a* \`${name}\`.`;
    } else {
        str = `\`${name2}\` *está repartiendo mimos.*`.trim();
    }
    
    if (m.isGroup) {
        try {
            // GIF aleatorio desde APIs de anime (con respaldo entre proveedores)
            await enviarReaccionAnime(conn, m, { reaccion: 'pat', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-pampering] no se pudo enviar el GIF:', e.message)
            // Si todas las APIs fallan, el comando responde igual con texto
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['pampering @tag'];
handler.tags = ['anime'];
handler.command = ['pampering', 'mimos', 'apapachar'];
handler.group = true;

export default handler;
