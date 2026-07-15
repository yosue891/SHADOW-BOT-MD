import fs from 'fs';
import path from 'path';

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
    m.react('🫣');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *se está escondiendo de* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *se está escondiendo de* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *se esconde silenciosamente...*`.trim();
    }
    
    if (m.isGroup) {
        let imagen = 'https://i.ibb.co/3NfYh9k/default-avatar.png';

        let mentions = [who];
        conn.sendMessage(m.chat, { image: { url: imagen }, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['hide @tag'];
handler.tags = ['anime'];
handler.command = ['hide', 'esconder', 'seesconde'];
handler.group = true;

export default handler;
