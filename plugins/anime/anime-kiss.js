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
    m.react('🫦');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *Le dio besos a* \`${name || who}\` *( ˘ ³˘)♥*.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *beso a* \`${name || who}\` 💋.`;
    } else {
        str = `\`${name2}\` *se besó a sí mismo ( ˘ ³˘)♥*`.trim();
    }
    
    if (m.isGroup) {
        let pp = 'https://files.catbox.moe/hu4p0g.mp4';
        let pp2 = 'https://files.catbox.moe/jevc51.mp4';
        let pp3 = 'https://files.catbox.moe/zekrvg.mp4';
        let pp4 = 'https://files.catbox.moe/czed90.mp4';
        let pp5 = 'https://files.catbox.moe/nnsf25.mp4';
        let pp6 = 'https://files.catbox.moe/zpxhw0.mp4';
        let pp7 = 'https://files.catbox.moe/er4b5i.mp4';
        let pp8 = 'https://files.catbox.moe/h462h6.mp4';
        let pp9 = 'https://files.catbox.moe/qelt3e.mp4';
        let pp10 = 'https://files.catbox.moe/t4e2j6.mp4';
        let pp11 = 'https://files.catbox.moe/x3bchw.mp4';   
        let pp12 = 'https://files.catbox.moe/odhu8s.mp4';
        let pp13 = 'https://files.catbox.moe/kvzxf4.mp4';
        let pp14 = 'https://files.catbox.moe/53dlob.mp4';
        let pp15 = 'https://files.catbox.moe/rln11n.mp4';
        let pp16 = 'https://files.catbox.moe/5ylp16.mp4';
        let pp17 = 'https://files.catbox.moe/wfix0f.mp4';
        let pp18 = 'https://files.catbox.moe/j7nbs3.mp4';
        let pp19 = 'https://files.catbox.moe/mi00rn.mp4';
    
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8, pp9, pp10, pp11, pp12, pp13, pp14, pp15, pp16, pp17, pp18, pp19];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
    }
}

handler.help = ['kiss/besar @tag'];
handler.tags = ['anime'];
handler.command = ['kiss','besar'];
handler.group = true;

export default handler;
