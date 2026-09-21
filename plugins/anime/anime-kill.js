import { enviarReaccionAnime } from '../../lib/anime-media.js'
import { resolverObjetivo, nombreSeguro } from '../../lib/anime-mention.js'
let handler = async (m, { conn, participants, groupMetadata, text, args, usedPrefix }) => {
  const { who, via, hasMention } = await resolverObjetivo(m, { conn, participants, groupMetadata, text, args });
  const hayMencion = hasMention || via === 'mention' || via === 'text';
  const name = await nombreSeguro(conn, who);
  const name2 = await nombreSeguro(conn, m.sender);
  await m.react('🗡️'); // Solo la espada

  let str = hayMencion
    ? `\`${name2}\` *mató a* \`${name}\` 💫.`
    : via === 'quoted'
    ? `\`${name2}\` *mató a* \`${name}\`.`
    : `\`${name2}\` *se mató a sí mismo 😵*`;

    if (m.isGroup) {
        try {
            // GIF aleatorio desde APIs de anime (con respaldo entre proveedores)
            await enviarReaccionAnime(conn, m, { reaccion: 'kill', caption: str, mentions: [who] });
        } catch (e) {
            console.error('[anime-kill] no se pudo enviar el GIF:', e.message)
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
