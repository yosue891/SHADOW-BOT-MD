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
    m.react('👅');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *lamió suavemente a* \`${name || who}\` *como una travesura.*`;
    } else if (m.quoted) {
        str = `\`${name2}\` *lamió suavemente a* \`${name || who}\` *como una travesura.*`;
    } else {
        str = `\`${name2}\` *saca la lengua y lame el aire por diversión.*`.trim();
    }
    
    if (m.isGroup) {
        try {
            await enviarReaccionAnime(conn, m, { reaccion: 'lick', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-lick] no se pudo enviar el GIF:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
}

handler.help = ['lick @tag'];
handler.tags = ['anime'];
handler.command = ['lick', 'lamer', 'licking'];
handler.group = true;

export default handler;
