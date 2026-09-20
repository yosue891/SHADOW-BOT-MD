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
    m.react('😏');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *esta seduciendo a* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está seduciendo a*  \`${name || who}\` *( ͡° ͜ʖ ͡°)*.`;
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
