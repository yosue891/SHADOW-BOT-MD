import fs from 'fs/promises'; 
import path from 'path'; 

const handler = async (m, {conn, isROwner, usedPrefix, command, text}) => {
  const ar = Object.keys(global.plugins);
  const ar1 = ar.map((v) => v.replace('.js', ''));
  
  if (!text) {
    const pluginsList = ar1.map((v) => `*◉* ${v}`).join('\n');
    return m.reply(`*✍️ 𝙸𝙽𝙶𝚁𝙴𝚂𝙰 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙳𝙴 𝙰𝙻𝙶𝚄𝙽 𝙿𝙻𝚄𝙶𝙸𝙽 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾) 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴*\n\n*—◉ 𝙴𝙹𝙴𝙼𝙿𝙻𝙾*\n*◉ ${usedPrefix + command}* info-infobot\n\n*—◉ 𝙻𝙸𝚂𝚃𝙰 𝙳𝙴 𝙿𝙻𝗨𝙶𝙸𝙽𝚂 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾𝚂) 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴𝚂:*\n${pluginsList}`);
  }

  const pluginName = text.replace(/.js$/i, '');
  const pluginFileName = `${pluginName}.js`;
  const pluginPath = path.join('./plugins', pluginFileName);

  if (!ar1.includes(pluginName)) {
    const pluginsList = ar1.map((v) => `*◉* ${v}`).join('\n');
    return m.reply(`*⭕ 𝙽𝙾 𝚂𝙴 𝙴𝙽𝙲𝙾𝙽𝚃𝚁𝙾 𝙽𝙸𝙽𝙶𝚄𝙽 𝙿𝙻𝚄𝙶𝙸𝙽 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾) 𝙻𝙻𝙰𝙼𝙰𝙳𝙾 "${text}", 𝙸𝙽𝙶𝚁𝙴𝚂𝙰 𝙰𝙻𝙶𝚄𝙽𝙾 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴*\n\n*==================================*\n\n*—◉ 𝙻𝙸𝚂𝚃𝙰 𝙳𝙴 𝙿𝙻𝚄𝙶𝙸𝙽𝚂 (𝙰𝚁𝙲𝙷𝙸𝚅𝙾𝚂) 𝙴𝚇𝙸𝚂𝚃𝙴𝙽𝚃𝙴𝚂:*\n${pluginsList}`);
  }

  let fileContent;
  
  try {
    fileContent = await fs.readFile(pluginPath, 'utf8');
    
    const messageResult = await conn.sendMessage(m.chat, {text: fileContent}, {quoted: m});
    
    await conn.sendMessage(
      m.chat, 
      {
        document: Buffer.from(fileContent, 'utf8'),
        mimetype: 'application/javascript', 
        fileName: pluginFileName
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
