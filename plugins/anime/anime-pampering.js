import fs from 'fs';
import path from 'path';
import { enviarReaccionAnime } from '../../lib/anime-media.js'

let handler = async (m, { conn, usedPrefix }) => {
    let who;

    if (m.mentionedJid.length > 0) {
        who = m.mentionedJid[0];
    } else if (m.quoted) {
        who = m.quoted.sender;
    } else {
        who = m.sender;
    }

    let name = conn.getName(who);
    let name2 = conn.getName(m.sender);
    m.react('🤗');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *está dando mimos a* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está dando mimos a* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *está repartiendo mimos.*`.trim();
    }
    
    if (m.isGroup) {
        try {
            // GIF aleatorio desde APIs de anime (con respaldo entre proveedores)
            await enviarReaccionAnime(conn, m, { reaccion: 'pat', caption: str, mentions: [who] });
        } catch (e) {
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
