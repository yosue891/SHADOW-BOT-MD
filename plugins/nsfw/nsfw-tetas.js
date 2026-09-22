let handler = async (m, { conn}) => {
  let chat = global.db.data.chats[m.chat];

  if (!chat.nsfw) return m.reply('⚠️ La opción NSFW está desactivada en este grupo.');

  let img = 'https://delirius-apiofc.vercel.app/nsfw/boobs';
  let text = '*🫨 TETAS*';

  await conn.sendMessage(m.chat, { image: { url: img}, caption: text}, { quoted: m});
  m.react('✅');
};

handler.help = ['tetas'];
handler.command = ['tetas'];
handler.tags = ['nsfw'];
handler.group = true;

export default handler;
