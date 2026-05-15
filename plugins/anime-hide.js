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
        let pp = 'https://cdn.adoolab.xyz/dl/36b9923f.mp4'; 
        let pp2 = 'https://cdn.adoolab.xyz/dl/a96d4b84.mp4'; 
        let pp3 = 'https://cdn.adoolab.xyz/dl/bc2fd5cb.mp4';
        let pp4 = 'https://cdn.adoolab.xyz/dl/dbe725db.mp4';
        let pp5 = 'https://cdn.adoolab.xyz/dl/cc2af6b0.mp4';
        let pp6 = 'https://cdn.adoolab.xyz/dl/dbe725db.mp4';
        let pp7 = 'https://cdn.adoolab.xyz/dl/bc2fd5cb.mp4';
        let pp8 = 'https://cdn.adoolab.xyz/dl/a96d4b84.mp4';
        
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['hide @tag'];
handler.tags = ['anime'];
handler.command = ['hide', 'esconder', 'seesconde'];
handler.group = true;

export default handler;
