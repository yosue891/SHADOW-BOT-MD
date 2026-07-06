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
    m.react('☕'); // Reacción con emoji de café

    let str;
    if (m.mentionedJid.length > 0 || m.quoted) {
        str = `☕ \`${name2}\` *está disfrutando una taza de café con* \`${name || who}\`. ¡Qué momento delicioso!`;
    } else {
        str = `☕ \`${name2}\` *se toma una taza de café solo*. A veces, el café en solitario sabe mejor. ☕`.trim();
    }

    if (m.isGroup) {
        const videos = [
            'https://files.catbox.moe/k6bzj0.mp4', 
            'https://files.catbox.moe/3pj3nx.mp4', 
            'https://files.catbox.moe/wcpe4z.mp4',
            'https://files.catbox.moe/64t3cf.mp4',
            'https://files.catbox.moe/qy1qmo.mp4',
            'https://files.catbox.moe/va1mu7.mp4',
            'https://files.catbox.moe/zqqre3.mp4',
            'https://files.catbox.moe/duydzw.mp4',
            'https://files.catbox.moe/4mn95m.mp4'
        ];

        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    } else {
        conn.sendMessage(m.chat, { text: str }, { quoted: m });
    }
};

handler.help = ['coffee/cafe @tag'];
handler.tags = ['anime'];
handler.command = ['coffee', 'cafe', 'taza'];
handler.group = true;

export default handler;                               
