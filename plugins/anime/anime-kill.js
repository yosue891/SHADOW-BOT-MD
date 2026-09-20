import axios from 'axios';

let handler = async (m, { conn }) => {
  let who = m.mentionedJid[0] || m.quoted?.sender || m.sender;
  let name = conn.getName(who);
  let name2 = conn.getName(m.sender);
  await m.react('🗡️'); // Solo la espada

  let str = m.mentionedJid.length > 0
    ? `\`${name2}\` *mató a* \`${name}\` 💫.`
    : m.quoted
    ? `\`${name2}\` *mató a* \`${name}\`.`
    : `\`${name2}\` *se mató a sí mismo 😵*`;

  if (m.isGroup) {
    const videos = [
      'https://files.catbox.moe/pv2q2f.mp4',
      'https://files.catbox.moe/oon0oa.mp4',
      'https://files.catbox.moe/vibexk.mp4',
      'https://files.catbox.moe/cv7odw.mp4',
      'https://files.catbox.moe/bztm0m.mp4',
      'https://files.catbox.moe/7ualwg.mp4'
    ];
    const videoUrl = videos[Math.floor(Math.random() * videos.length)];

    try {
      const { data } = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(data);

      await conn.sendMessage(m.chat, {
        video: buffer,
        gifPlayback: true,
        caption: str,
        mentions: [who]
      }, { quoted: m });

    } catch (e) {
      await conn.reply(m.chat, '⚠️ El video no se pudo cargar correctamente.', m);
    }
  }
};

handler.help = ['kill', 'matar @tag'];
handler.tags = ['anime'];
handler.command = ['kill', 'matar'];
handler.group = true;

export default handler;
