import axios from 'axios';

// ✅ Solo las categorías que quieres
const categoriasValidas = [
  'waifu', 'husbando', 'kitsune', 'neko', 'kemonomimi'
];

const handler = async (m, { command, conn }) => {
  try {
    // Si el comando no está en las categorías válidas, no hace nada
    if (!categoriasValidas.includes(command)) return;

    const res = await axios.get('https://api.kirito.my/api/anime?apikey=by_deylin');
    const images = res.data.images;

    if (!images || images.length === 0) throw 'No se encontraron imágenes';

    // Filtra imágenes que contengan el nombre del comando en la URL
    const filtradas = images.filter(url => url.toLowerCase().includes(command.toLowerCase()));

    // Si no hay coincidencias, usa una imagen aleatoria
    const imageUrl = filtradas.length > 0
      ? filtradas[Math.floor(Math.random() * filtradas.length)]
      : images[Math.floor(Math.random() * images.length)];

    // Reacciona al mensaje del usuario con ♥️
    await conn.sendMessage(m.chat, { react: { text: '♥️', key: m.key } });

    // Envía la imagen con botón para pedir otra del mismo tipo
    await conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: `🌌 Aquí tienes una imagen de tipo *${command}*`,
      footer: '¿Quieres otra?',
      buttons: [
        {
          buttonId: `.${command}`,
          buttonText: { displayText: `Siguiente ${command} 🔁` },
          type: 1
        }
      ],
      headerType: 4
    }, { quoted: m });

  } catch (e) {
    m.reply('⚠️ Las sombras no pudieron encontrar una imagen...');
    console.error(e);
  }
};

// ✅ Solo los comandos válidos
handler.command = handler.help = categoriasValidas;
handler.tags = ['anime'];
export default handler;
