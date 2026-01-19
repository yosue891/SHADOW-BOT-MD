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
    m.react('🏳️‍🌈');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *beso excitantemente a* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *beso apasionado a* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *se besa asi mismo por qué es un rolo de gay XD.*`.trim();
    }
    
    if (m.isGroup) {
        let pp = 'https://files.catbox.moe/0p0gsn.mp4'; 
        let pp2 = 'https://files.catbox.moe/me6rsr.mp4'; 
        let pp3 = 'https://files.catbox.moe/untes1.mp4';
        let pp4 = 'https://files.catbox.moe/8af0gd.mp4';
        let pp5 = 'https://files.catbox.moe/z27nnd.mp4';
        let pp6 = 'https://files.catbox.moe/c5fxap.mp4';
        let pp7 = 'https://files.catbox.moe/2c3ejd.mp4';
                
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8, pp9, pp10, pp11, pp12, pp13, pp14, pp15, pp16, pp17, pp18, pp19, pp20, pp21, pp22, pp23, pp24];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['kiss2/besar2 @tag'];
handler.tags = ['anime'];
handler.command = ['kiss2','besar2'];
handler.group = true;

export default handler;
