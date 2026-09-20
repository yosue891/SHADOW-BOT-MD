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
    m.react('😁');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *está feliz por* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está feliz por* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *está muy feliz hoy.*`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'happy', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-happy] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['happy/feliz @tag'];
handler.tags = ['anime'];
handler.command = ['happy', 'feliz'];
handler.group = true;

export default handler;
