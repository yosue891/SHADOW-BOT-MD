import fs from 'fs';
import path from 'path';
import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'

let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
    const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
    const hayMencion = hasMention || via === 'mention' || via === 'text';

    const name = await nombreSeguro(conn, who);
    const name2 = await nombreSeguro(conn, m.sender);
    m.react('🩸');

    let str;
    if (hayMencion || via === 'quoted') {
        str = `\`${name2}\` *mordió a* \`${name}\` 😵‍💫`;
} else {
        str = `\`${name2}\` *mordió el vacío... ¿tienes hambre o estás poseído?* 🫠`;
}

    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'bite', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-morder] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
};

handler.help = ['morder @tag'];
handler.tags = ['anime', 'fun'];
handler.command = ['morder', 'bite'];
handler.group = true;

export default handler;
