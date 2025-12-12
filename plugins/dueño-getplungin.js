import fs from 'fs';
import archiver from 'archiver';

const handler = async (m, { conn, isROwner, usedPrefix, command, text }) => {
  const ar = Object.keys(global.plugins || {});
  const ar1 = ar.map((v) => v.replace('.js', ''));

  if (!text) {
    return conn.reply(
      m.chat,
      `📂 Ingrese el nombre de algún plugin (archivo) existente*\n\n*—◉ Ejemplo*\n*◉ ${usedPrefix + command} info-infobot*\n\n*—◉ Lista de plugins (archivos) existentes:*\n*◉* ${ar1.map((v) => ' ' + v).join`\n*◉*`}`,
      m
    );
  }

  if (!ar1.includes(text)) {
    return conn.reply(
      m.chat,
      `❌ No se encontró ningún plugin (archivo) llamado "${text}", ingrese alguno existente*\n\n*==================================*\n\n*—◉ Lista de plugins (archivos) existentes:*\n*◉* ${ar1.map((v) => ' ' + v).join`\n*◉*`}`,
      m
    );
  }

  try {
    const filePath = `./plugins/${text}.js`;
    if (!fs.existsSync(filePath)) {
      return conn.reply(m.chat, `⚠️ El archivo ${text}.js no existe en la carpeta plugins.`, m);
    }

    // Enviar el archivo .js directamente
    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(filePath),
        mimetype: 'application/javascript',
        fileName: `${text}.js`
      },
      { quoted: m }
    );

    // Crear un ZIP con el archivo
    const zipPath = `./plugins/${text}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.file(filePath, { name: `${text}.js` });
    await archive.finalize();

    output.on('close', async () => {
      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(zipPath),
          mimetype: 'application/zip',
          fileName: `${text}.zip`
        },
        { quoted: m }
      );
      fs.unlinkSync(zipPath); // borrar el zip temporal
    });

  } catch (e) {
    conn.reply(m.chat, `❌ Error al obtener el plugin: ${e.message}`, m);
  }
};

handler.help = ['getplugin'];
handler.tags = ['owner'];
handler.command = ['getplugin', 'plugin'];
handler.rowner = true;

export default handler;
