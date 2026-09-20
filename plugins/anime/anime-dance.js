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
    m.react('💃');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *bailá junto con* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *esta bailando con* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *suelta los pasos prohibidos.*`.trim();
    }
    
    if (m.isGroup) {
        let pp = 'https://files.catbox.moe/1ihm59.mp4'; 
        let pp2 = 'https://files.catbox.moe/fuw5jt.mp4'; 
        let pp3 = 'https://files.catbox.moe/u9lihf.mp4';
        let pp4 = 'https://files.catbox.moe/dhd4cg.mp4';
        let pp5 = 'https://files.catbox.moe/yyul5f.mp4';
        let pp6 = 'https://files.catbox.moe/o0p0kl.mp4';
        let pp7 = 'https://files.catbox.moe/8ds17n.mp4';
        let pp8 = 'https://files.catbox.moe/4aoknb.mp4';
        
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['dance/bailar @tag'];
handler.tags = ['anime'];
handler.command = ['dance', 'bailar'];
handler.group = true;

export default handler;
