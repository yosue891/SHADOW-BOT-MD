import fs from 'fs';
import path from 'path';

const RAIZ = path.join(process.cwd(), 'plugins');

let handler = async (m, { text, usedPrefix, command }) => {
  const emoji = '📥';
  const emoji2 = '⚠️';
  const msm = '❌';

  if (!text) {
    return m.reply(`${emoji} Por favor, ingrese el nombre del plugin.\n\n▸ Ejemplos:\n• *${usedPrefix}${command} mi-plugin* → se guarda en plugins/mi-plugin.js\n• *${usedPrefix}${command} fun/mi-plugin* → se guarda en plugins/fun/mi-plugin.js`);
  }

  if (!m.quoted || !m.quoted.text) {
    return m.reply(`${emoji2} Responda al mensaje que contiene el código del plugin.`);
  }

  let relativo = text.trim().replace(/\\/g, '/').replace(/^plugins\//i, '').replace(/^\.\//, '');
  if (!relativo || relativo.includes('..') || path.isAbsolute(relativo)) {
    return m.reply(`${msm} Ruta inválida. Use por ejemplo: *mi-plugin* o *fun/mi-plugin*.`);
  }
  if (!relativo.endsWith('.js')) relativo += '.js';

  const destino = path.join(RAIZ, relativo);
  if (!destino.startsWith(RAIZ)) return m.reply(`${msm} Ruta inválida.`);

  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, m.quoted.text);
    m.reply(`${emoji} Plugin guardado exitosamente en: plugins/${relativo}`);
  } catch (error) {
    m.reply(`${msm} Ocurrió un error al guardar el plugin:\n${error.message}`);
  }
};

handler.help = ['saveplugin'];
handler.tags = ['owner'];
handler.command = ['saveplugin'];
handler.owner = true;

export default handler;
