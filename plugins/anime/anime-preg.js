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
    m.react('🤰');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *embarazo a* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *embarazo a* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *se embarazó a sí mismo >.<.*`.trim();
    }
    
    if (m.isGroup) { 
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'preg', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-preg] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['pregg/embarazar @tag'];
handler.tags = ['anime'];
handler.command = ['preg','embarazar','preñar'];
handler.group = true;

export default handler;
