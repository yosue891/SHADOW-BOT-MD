import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return m.reply(
      `🎭 Falta tu búsqueda, sombra...\n\nEjemplos:\n` +
      `• ${usedPrefix}wp eminence in shadow\n` +
      `• ${usedPrefix}wallpaper naruto\n` +
      `• ${usedPrefix}wallpaper christmas anime`
    );
  }

  try {
    // Llamada a Nekos API
    let res = await fetch(`https://api.nekosapi.com/v4/images?tags=${encodeURIComponent(text)}&limit=50`);
    let data = await res.json();

    if (!data.items?.length) return m.reply(`❄️ Sin resultados para: "${text}".`);

    let img = data.items[Math.floor(Math.random() * data.items.length)].image_url;

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption: `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda anime: *${text}*\n⚔️ Shadow-BOT-MD • Panel navideño 🎄`,
      footer: 'Presiona un botón para continuar',
      buttons: [
        { buttonId: `${usedPrefix}${command} ${text}`, buttonText: { displayText: '🔄 Siguiente sombra' }, type: 1 },
        { buttonId: `${usedPrefix}pinterest ${text}`, buttonText: { displayText: '🎄 Pinterest navideño' }, type: 1 },
        { buttonId: `${usedPrefix}image ${text}`, buttonText: { displayText: '🕶️ Google sombrío' }, type: 1 }
      ],
      headerType: 4
    }, { quoted: m });
  } catch (e) {
    console.log('[anime-wallpaper] error:', e);
    await m.reply(`⚠️ Error en ${usedPrefix}${command}.`);
  }
};

handler.command = ['wallpaper', 'wp'];
export default handler;
