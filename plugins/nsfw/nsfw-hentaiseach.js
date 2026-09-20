import axios from 'axios';

const handler = async (m, { conn, command, args}) => {
  try {
    // Verifica si el grupo tiene NSFW activado
    if (!global.db.data.chats[m.chat].nsfw && m.isGroup) {
      return m.reply(`🚫 El contenido *NSFW* está desactivado en este grupo.\n🛡️ Un administrador puede activarlo con: *.on nsfw*`);
}

    // Categorías disponibles
    const categorias = ['waifu', 'neko', 'trap', 'blowjob'];
    const categoria = args[0]?.toLowerCase();

    if (!categoria ||!categorias.includes(categoria)) {
      return m.reply(`🔞 *Uso correcto del comando:*\n\n.hentaisearch <categoría>\n\n📂 Categorías disponibles:\n${categorias.map(c => `• ${c}`).join('\n')}\n\n📌 Ejemplo:\n.hentaisearch waifu`);
}

    // Petición a la API
    const { data} = await axios.get(`https://api.waifu.pics/nsfw/${categoria}`);

    // Enviar imagen con mensaje decorado
    await conn.sendFile(m.chat, data.url, `${categoria}.jpg`, `
🔞 *NSFW: ${categoria.toUpperCase()}*
${pickRandom(['🥵', '👀', '🔥', '🍑', '😳'])} *Disfrútala con moderación* ${pickRandom(['🌚', '💦', '🫦'])}
`, m);
} catch (e) {
    console.error(e);
    m.reply('❌ Error al obtener la imagen. Intenta de nuevo más tarde.');
}
};

handler.command = ['hentaisearch'];
handler.tags = ['nsfw'];
handler.help = ['hentaisearch <categoría>'];
handler.group = true;

export default handler;

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
