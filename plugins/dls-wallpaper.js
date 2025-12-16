import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return m.reply(
      `🎭 Falta tu búsqueda, sombra...\n\nEjemplos:\n` +
      `• ${usedPrefix}wp eminence in shadow\n` +
      `• ${usedPrefix}wallpaper Navidad`
    );
  }

  try {
    let apiKey = '53759164-e570f6b40878738322bd6681a'; // Puedes reemplazar por tu clave personal
    let res = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(text)}&image_type=photo&orientation=vertical&per_page=50`);
    let data = await res.json();

    if (!data.hits?.length) return m.reply(`❄️ Sin resultados para: "${text}". Cambia la búsqueda.`);

    let img = data.hits[Math.floor(Math.random() * data.hits.length)].largeImageURL;

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption: `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda: *${text}*\n⚔️ Shadow-BOT-MD • Panel navideño 🎄`
    }, { quoted: m });
  } catch (e) {
    console.log('[wallpaper] error:', e);
    await m.reply(`⚠️ Error en ${usedPrefix}${command}. Usa *${usedPrefix}report* si persiste.`);
  }
};

handler.command = ['wallpaper', 'wp'];
export default handler;
