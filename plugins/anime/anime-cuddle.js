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
    m.react('👥');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *se acurrucó con* ${name || who}.`;
    } else if (m.quoted) {
        str = `\`${name2}\` *está acurrucándose con* ${name || who}.`;
    } else {
        str = `\`${name2}\` *se esta acurrucando.*`.trim();
    }
    
    if (m.isGroup) {
        // GIFs eliminados: las URLs (adofiles.i11.eu) ya no funcionan (402).
        let mentions = [who];
        await conn.sendMessage(m.chat, { text: str, mentions }, { quoted: m });
    }
}

handler.help = ['cuddle/acurrucarse @tag'];
handler.tags = ['anime'];
handler.command = ['cuddle', 'acurrucarse'];
handler.group = true;

export default handler;
