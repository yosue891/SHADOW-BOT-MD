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
    m.react('😥');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *está triste por* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está triste por* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *está muy triste.*`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'sad', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-sad] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['sad/triste @tag'];
handler.tags = ['anime'];
handler.command = ['sad', 'triste'];
handler.group = true;

export default handler;
