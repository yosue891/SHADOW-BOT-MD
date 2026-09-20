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
    m.react('😴');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *se recuesta sobre* \`${name || who}\`.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *se recuesta sobre* \`${name || who}\`.`;
    } else {
        str = `\`${name2}\` *se recuesta y se relaja por completo.*`.trim();
    }
    
    if (m.isGroup) {
        // Imagen eliminada: i.ibb.co/3NfYh9k/default-avatar.png ya no existe (404).
        let mentions = [who];
        await conn.sendMessage(m.chat, { text: str, mentions }, { quoted: m });
    }
}

handler.help = ['lean @tag'];
handler.tags = ['anime'];
handler.command = ['lean', 'recostar', 'recostarse'];
handler.group = true;

export default handler;
