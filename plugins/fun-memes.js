import axios from 'axios';

let handler = async (m, { command, conn }) => {
  try {
    
    const res = await axios.get('https://meme-api.com/gimme/memesESP');
    const memeUrl = res.data.url;

    if (!memeUrl) throw 'No se encontró meme en español';

    const wm = (typeof global !== 'undefined' && global.wm) ? global.wm : 'Shadow-BOT-MD ⚔️';
    const bot = 'Shadow-BOT-MD ⚔️';

    let fkontak = {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: '0@s.whatsapp.net'
    };

    let caption = `╔══ 🎄 ✦ 🎁 ✦ 🎄 ══╗
   *S H A D O W - M E M E S*
╚══ 🎄 ✦ 🎁 ✦ 🎄 ══╝

🧠 Aquí tienes un meme en español invocado desde las sombras festivas...
✨ Que la risa ilumine tu noche navideña.`;

    await conn.sendButton(
      m.chat,
      caption,
      wm,
      memeUrl,
      [
        ['🎁 Siguiente meme 🔁', '.meme'],
        ['☘️ Volver al Menú', '/menu']
      ],
      null,
      [[bot, 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O']],
      fkontak
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '✖️', key: m.key } });
    m.reply('⚠️ Las sombras navideñas no pudieron encontrar un meme en español...');
    console.error(e);
  }
};

handler.command = handler.help = ['meme'];
handler.tags = ['diversión', 'humor'];
export default handler;
