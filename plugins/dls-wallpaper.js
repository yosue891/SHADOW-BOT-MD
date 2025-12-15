import { wallpaper, wallpaperv2 } from '@bochilteam/scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return m.reply(
      `🎭 Falta tu búsqueda, sombra...\n` +
      `Ejemplos:\n` +
      `• ${usedPrefix}wp eminence in shadow\n` +
      `• ${usedPrefix}wallpaper Navidad\n` +
      `• ${usedPrefix}wallpaper2 anime`
    );
  }

  try {
    const src = command === 'wallpaper2' ? wallpaperv2 : wallpaper;
    const res = await src(text.trim());
    if (!res?.length) return m.reply(`❄️ Sin resultados para: "${text}". Cambia la búsqueda.`);

    const pick = res[Math.floor(Math.random() * res.length)];
    const imageUrl = typeof pick === 'string' ? pick : (pick.image || pick.url || pick.link);

    const caption = `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda: *${text}*\n\n⚔️ Shadow-BOT-MD • Panel navideño 🎄`;

    await conn.sendMessage(
      m.chat,
      {
        image: { url: imageUrl },
        caption,
        buttons: [
          { buttonId: `retry_${Date.now()}`, buttonText: { displayText: '🔄 Siguiente sombra' }, type: 1 },
          { buttonId: `${usedPrefix}pinterest ${text}`, buttonText: { displayText: '🎄 Pinterest navideño' }, type: 1 },
          { buttonId: `${usedPrefix}image ${text}`, buttonText: { displayText: '🕶️ Google sombrío' }, type: 1 }
        ],
        headerType: 4
      },
      { quoted: m }
    );
  } catch (e) {
    await conn.reply(m.chat, `⚠️ Error en ${usedPrefix}${command}. #report\n🎄 Reintenta.`, m);
    console.log('[shadow-wallpaper] error:', e);
    handler.limit = false; // evita consumir límite si falla
  }
};

// Ayuda/registro
handler.help = ['wp <query>', 'wallpaper <query>', 'wallpaper2 <query>'];
handler.tags = ['downloader'];
handler.command = ['wp', 'wallpaper', 'wallpaper2']; // array para loaders que no indexan regex
handler.register = false; // ponlo en true si tu sistema lo requiere
handler.group = false;    // ponlo true si solo en grupos
handler.level = 0;        // evita bloqueo por nivel
handler.limit = 1;

export default handler;

// Log al cargar
console.log('[shadow-wallpaper] plugin cargado: wp, wallpaper, wallpaper2');
