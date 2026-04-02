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
    let apiKey = '53759164-e570f6b40878738322bd6681a'; // Reemplaza por tu clave personal si quieres
    let res = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(text)}&image_type=photo&orientation=vertical&per_page=50`);
    let data = await res.json();

    if (!data.hits?.length) return m.reply(`❄️ Sin resultados para: "${text}". Cambia la búsqueda.`);

    let img = data.hits[Math.floor(Math.random() * data.hits.length)].largeImageURL;

    let fkontak = {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: '0@s.whatsapp.net'
    };

    let str = `❄️✨ La sombra sonríe entre luces festivas...\n🔎 Búsqueda: *${text}*\n⚔️ Shadow-BOT-MD • Panel navideño 🎄`;

    await conn.sendButton(
      m.chat,
      str,
      '🎄✨ Shadow-BOT-MD — La sombra también celebra la Navidad UwU ✨🎄', // Footer fijo navideño
      img,
      [
        ['🔄 Siguiente sombra', `${usedPrefix}${command} ${text}`],
        ['🎄 Pinterest navideño', `${usedPrefix}pinterest ${text}`]
      ],
      null,
      [['Shadow-BOT-MD ⚔️', 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O']],
      fkontak
    );
  } catch (e) {
    console.log('[wallpaper] error:', e);
    await m.reply(`⚠️ Error en ${usedPrefix}${command}. Usa *${usedPrefix}report* si persiste.`);
  }
};

handler.command = ['wallpaper', 'wp'];
export default handler;
