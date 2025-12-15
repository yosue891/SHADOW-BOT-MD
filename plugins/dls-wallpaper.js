import { wallpaper } from '@bochilteam/scraper';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return m.reply(
      `🎭 Falta tu búsqueda, sombra...\n\nEjemplos:\n` +
      `• ${usedPrefix}wp eminence in shadow\n` +
      `• ${usedPrefix}wallpaper Navidad`
    );
  }

  try {
    const res = await wallpaper(text.trim());
    if (!res?.length) return m.reply(`❄️ Sin resultados para: "${text}". Cambia la búsqueda.`);

    const pick = res[Math.floor(Math.random() * res.length)];
    const imageUrl = typeof pick === 'string' ? pick : (pick.image || pick.url || pick.link);

    await conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda: *${text}*\n\n⚔️ Shadow-BOT-MD • Panel navideño 🎄`,
      footer: 'Presiona un botón para continuar',
      buttons: [
        { buttonId: `${usedPrefix}${command} ${text}`, buttonText: { displayText: '🔄 Siguiente sombra' }, type: 1 },
        { buttonId: `${usedPrefix}pinterest ${text}`, buttonText: { displayText: '🎄 Pinterest navideño' }, type: 1 },
        { buttonId: `${usedPrefix}image ${text}`, buttonText: { displayText: '🕶️ Google sombrío' }, type: 1 }
      ],
      headerType: 4
    }, { quoted: m });
  } catch (e) {
    console.log('[wallpaper] error:', e);
    await m.reply(`⚠️ Error en ${usedPrefix}${command}. Usa *${usedPrefix}report* si persiste.`);
  }
};

handler.help = ['wp <query>', 'wallpaper <query>'];
handler.tags = ['downloader'];
handler.command = ['wp', 'wallpaper']; // ✅ solo comandos válidos
handler.group = false;
handler.register = false;
handler.limit = 1;
handler.level = 0;

export default handler;
