import fs from 'fs/promises'; 
import path from 'path'; 

const RAIZ = path.join(process.cwd(), 'plugins');

const handler = async (m, {conn, isROwner, usedPrefix, command, text}) => {
  const ar = Object.keys(global.plugins).map((v) => v.replace(/\\/g, '/'));
  const ar1 = ar.map((v) => v.replace(/\.js$/i, ''));

  const listaPlugins = () => ar1.map((v) => `*◉* ${v}`).join('\n');

  if (!text) {
    return m.reply(`*✍️ 𝙸𝙽𝙶𝚁𝙴𝚂𝙰 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙳𝙴 𝙰𝙻𝙶𝚄𝙽 𝙿𝙻𝚄𝙶𝙸𝙽 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾) 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴*\n\n*—◉ 𝙴𝙹𝙴𝙼𝙿𝙻𝙾*\n*◉ ${usedPrefix + command}* fun-top\n*◉ ${usedPrefix + command}* grupos/group-kick\n\n*—◉ 𝙻𝙸𝚂𝚃𝙰 𝙳𝙴 𝙿𝙻𝚄𝗚𝙸𝙽𝚂 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴𝚂:*\n${listaPlugins()}`);
  }

  const pedido = text.trim().replace(/\\/g, '/').replace(/\.js$/i, '');
  let clave = ar1.includes(pedido) ? pedido : ar1.find((v) => v.endsWith(`/${pedido}`));

  if (!clave) {
    return m.reply(`*⭕ 𝙽𝙾 𝚂𝙴 𝙴𝙽𝙲𝙾𝙽𝚃𝚁𝙾 𝙽𝙸𝙽𝙶𝚄𝙽 𝙿𝙻𝚄𝙶𝙸𝙽 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾) 𝙻𝙻𝙰𝙼𝙰𝙳𝙾 "${text}", 𝙸𝙽𝙶𝚁𝙴𝚂𝙰 𝙰𝙻𝙶𝚄𝙽𝙾 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴*\n\n*==================================*\n\n*—◉ 𝙻𝙸𝚂𝚃𝙰 𝙳𝙴 𝙿𝙻𝚄𝗚𝙸𝙽𝚂 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴𝚂:*\n${listaPlugins()}`);
  }

  const pluginFileName = `${clave}.js`;
  const pluginPath = path.join(RAIZ, pluginFileName);

  let fileContent;
  
  try {
    fileContent = await fs.readFile(pluginPath, 'utf8');
    
    const messageResult = await conn.sendMessage(m.chat, {text: fileContent}, {quoted: m});
    
    await conn.sendMessage(
      m.chat, 
      {
        document: Buffer.from(fileContent, 'utf8'),
        mimetype: 'application/javascript', 
        fileName: path.basename(pluginFileName)
      }, 
      {quoted: messageResult}
    );
    
  } catch (error) {
    console.error('Error al leer el plugin:', error);
    m.reply(`*❌ 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙻𝙴𝙴𝚁 𝙴𝙻 𝙰𝚁𝙲𝙷𝙸𝚅𝙾*\n\n*Detalles del error (consola):*\n${error.message}`);
  }
};

handler.help = ['getplugin'].map((v) => v + ' *<nombre>*');
handler.tags = ['owner'];
handler.command = ['getplugin', 'gp'];
handler.rowner = true;

export default handler;
