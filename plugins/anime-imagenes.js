import axios from 'axios';

// ✅ Todos los tags disponibles en waifu.im
const categoriasValidas = [
  'waifu','maid','uniform','oppai','selfies',
  'marin-kitagawa','raiden-shogun','makima','zero-two','yumeko-jabami',
  'kurumi-tokisaki','miku','toga','yor-forger','power',
  'emilia','rem','ram','futaba-sakura','hinata',
  'sakura','tsunade','boa-hancock','nami','robin'
];

const handler = async (m, { command, conn }) => {
  try {
    if (!categoriasValidas.includes(command)) return;

    // 🔑 Consulta a waifu.im con el tag correspondiente
    const res = await axios.get(`https://api.waifu.im/search/?included_tags=${command}`);
    const images = res?.data?.images;

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('No se encontraron imágenes');
    }

    // Selecciona una imagen aleatoria
    const imageUrl = images[Math.floor(Math.random() * images.length)].url;

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
          buttonText: { displayText: `Siguiente ${command} 🔁` }
        }
      ],
      headerType: 1
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    m.reply('⚠️ Las sombras no pudieron encontrar una imagen...');
  }
};

// ✅ Todos los comandos válidos
handler.command = handler.help = categoriasValidas;
handler.tags = ['anime'];
export default handler;
