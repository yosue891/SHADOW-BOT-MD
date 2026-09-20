import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, usedPrefix}) => {
    let who;

    if (m.mentionedJid.length> 0) {
        who = m.mentionedJid[0];
} else if (m.quoted) {
        who = m.quoted.sender;
} else {
        who = m.sender;
}

    let name = await conn.getName(who);
    let name2 = await conn.getName(m.sender);
    m.react('🩸');

    let str;
    if (m.mentionedJid.length> 0 || m.quoted) {
        str = `\`${name2}\` *mordió a* \`${name || who}\` 😵‍💫`;
} else {
        str = `\`${name2}\` *mordió el vacío... ¿tienes hambre o estás poseído?* 🫠`;
}

    if (m.isGroup) {
        let v1 = 'https://adofiles.i11.eu/dl/ths5.mp4';
        let v2 = 'https://adofiles.i11.eu/dl/y3dj.mp4';
        let v3 = 'https://adofiles.i11.eu/dl/d24u.mp4';
        let v4 = 'https://adofiles.i11.eu/dl/604q.mp4';
        let v5 = 'https://adofiles.i11.eu/dl/6820.mp4';
        let v6 = 'https://adofiles.i11.eu/dl/53o5.mp4';
        let v7 = 'https://adofiles.i11.eu/dl/6820.mp4';
        let v8 = 'https://adofiles.i11.eu/dl/53o5.mp4';
        let v9 = 'https://adofiles.i11.eu/dl/604q.mp4';

        const videos = [v1, v2, v3, v4, v5, v6, v7, v8, v9];
        const video = videos[Math.floor(Math.random() * videos.length)];

        let mentions = [who];
        conn.sendMessage(m.chat, {
            video: { url: video},
            gifPlayback: true,
            caption: str,
            mentions
}, { quoted: m});
}
};

handler.help = ['morder @tag'];
handler.tags = ['anime', 'fun'];
handler.command = ['morder', 'bite'];
handler.group = true;

export default handler;
