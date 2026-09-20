import fs from 'fs';
import path from 'path';
import { enviarReaccionAnime } from '../../lib/anime-media.js'

let handler = async (m, { conn, usedPrefix}) => {
    let who;

    if (m.mentionedJid.length> 0) {
        who = m.mentionedJid[0];
} else if (m.quoted) {
        who = m.quoted.sender;
} else {
        who = m.sender;
}

    let name = await conn.getName(who);
    let name2 = await conn.getName(m.sender);
    m.react('🩸');

    let str;
    if (m.mentionedJid.length> 0 || m.quoted) {
        str = `\`${name2}\` *mordió a* \`${name || who}\` 😵‍💫`;
} else {
        str = `\`${name2}\` *mordió el vacío... ¿tienes hambre o estás poseído?* 🫠`;
}

    if (m.isGroup) {
        try {
            // GIF aleatorio desde APIs de anime (con respaldo entre proveedores)
            await enviarReaccionAnime(conn, m, { reaccion: 'bite', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-morder] no se pudo enviar el GIF:', e.message)
            // Si todas las APIs fallan, el comando responde igual con texto
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
};

handler.help = ['morder @tag'];
handler.tags = ['anime', 'fun'];
handler.command = ['morder', 'bite'];
handler.group = true;

export default handler;
