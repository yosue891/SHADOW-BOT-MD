// Handler para el comando .mlt
const handler = async (m, { conn, text }) => {
  // Aquí defines la respuesta que quieres dar
  await conn.sendMessage(m.chat, { text: '✨ Ejecutando comando .mlt ✨' }, { quoted: m });
};

// Registro del comando
handler.command = /^mlt$/i;   // ← reconoce ".mlt"
handler.help = ['mlt'];
handler.tags = ['tools'];

export default handler;
