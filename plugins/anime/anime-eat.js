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
    m.react('😋');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *está comiendo con* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está comiendo con* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *come algo delicioso*.`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'nom', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-eat] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['eat/comer @tag'];
handler.tags = ['anime'];
handler.command = ['eat','comer'];
handler.group = true;

export default handler;
