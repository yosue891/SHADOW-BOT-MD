import { enviarReaccionAnime } from '../../lib/anime-media.js'
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
        try {
            // GIF aleatorio desde APIs de anime (con respaldo entre proveedores)
            await enviarReaccionAnime(conn, m, { reaccion: 'kill', caption: str, mentions: [who] });
        } catch (e) {
            // Si todas las APIs fallan, el comando responde igual con texto
            await conn.sendMessage(m.chat, { text: str, mentions: [who] }, { quoted: m });
        }
    }
};

handler.help = ['kill', 'matar @tag'];
handler.tags = ['anime'];
handler.command = ['kill', 'matar'];
handler.group = true;

export default handler;
