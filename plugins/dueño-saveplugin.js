import fs from 'fs';

let handler = async (m, { text, usedPrefix, command }) => {
  const emoji = '📥';
  const emoji2 = '⚠️';
  const msm = '❌';

  if (!text) {
    return m.reply(`${emoji} Por favor, ingrese el nombre del plugin.`);
  }

  if (!m.quoted || !m.quoted.text) {
    return m.reply(`${emoji2} Responda al mensaje que contiene el código del plugin.`);
  }

  const ruta = `plugins/${text}.js`;

  try {
    fs.writeFileSync(ruta, m.quoted.text);
    m.reply(`${emoji} Plugin guardado exitosamente en: ${ruta}`);
  } catch (error) {
    m.reply(`${msm} Ocurrió un error al guardar el plugin:\n${error.message}`);
  }
};

handler.help = ['saveplugin'];
handler.tags = ['owner'];
handler.command = ['saveplugin'];
handler.owner = true;

export default handler;
