let handler = async (m, { conn }) => {
  try {
    let userName = m.pushName || 'Sin nombre';
    m.reply(`Nombre del usuario: ${userName}`);
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ['nombre'];
handler.tags = ['tools'];
handler.command = /^(nombre)$/i;

export default handler;
