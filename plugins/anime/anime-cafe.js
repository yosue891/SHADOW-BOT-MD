const CAFE_VIDEOS = [
  'https://u.pone.rs/wrdixhdu.mp4',
  'https://u.pone.rs/lsvklqjq.mp4',
  'https://u.pone.rs/xzsgbdlb.mp4',
  'https://u.pone.rs/sjlogmhw.mp4',
  'https://u.pone.rs/cwurrbtn.mp4'
]

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
        try {
            const video = CAFE_VIDEOS[Math.floor(Math.random() * CAFE_VIDEOS.length)]
            await conn.sendMessage(m.chat, { video: { url: video }, mimetype: 'video/mp4', gifPlayback: true, caption: str, mentions: [who] }, { quoted: m });
        } catch (e) {
            console.error('[anime-cafe] no se pudo enviar el video:', e.message)
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    } else {
        await conn.sendMessage(m.chat, { text: str }, { quoted: m });
    }
};

handler.help = ['coffee/cafe @tag'];
handler.tags = ['anime'];
handler.command = ['coffee', 'cafe', 'taza'];
handler.group = true;

export default handler;                               
