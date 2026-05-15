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
    m.react('😮‍💨');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *acaba de bostezar frente a* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *acaba de bostezar frente a* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *acaba de bostezar... qué sueño tiene.*`.trim();
    }
    
    if (m.isGroup) {
        let pp = 'https://cdn.adoolab.xyz/dl/6eb830a9.mp4'; 
        let pp2 = 'https://cdn.adoolab.xyz/dl/65947a78.mp4'; 
        let pp3 = 'https://cdn.adoolab.xyz/dl/5b3185d9.mp4';
        let pp4 = 'https://cdn.adoolab.xyz/dl/e999bff8.mp4';
        let pp5 = 'https://cdn.adoolab.xyz/dl/6eb830a9.mp4';
        let pp6 = 'https://cdn.adoolab.xyz/dl/65947a78.mp4';
        let pp7 = 'https://cdn.adoolab.xyz/dl/5b3185d9.mp4';
        let pp8 = 'https://cdn.adoolab.xyz/dl/e999bff8.mp4';
        
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['yawn @tag'];
handler.tags = ['anime'];
handler.command = ['yawn', 'bostezo', 'bostezar'];
handler.group = true;

export default handler;
