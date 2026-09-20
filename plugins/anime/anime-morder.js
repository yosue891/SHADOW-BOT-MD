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
        // GIFs eliminados: las URLs (adofiles.i11.eu) ya no funcionan (402).
        let mentions = [who];
        await conn.sendMessage(m.chat, { text: str, mentions }, { quoted: m });
    }
};

handler.help = ['morder @tag'];
handler.tags = ['anime', 'fun'];
handler.command = ['morder', 'bite'];
handler.group = true;

export default handler;
