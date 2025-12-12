import fs from 'fs';

const handler = async (m, { conn, isROwner, usedPrefix, command, text }) => {
  // Optional: enforce root-owner usage
  if (handler.rowner && !isROwner) {
    return conn.reply(m.chat, '⚠️ Solo el propietario raíz puede usar este comando.', m);
  }

  // Build a clean list of plugin names (without .js)
  const rawKeys = Object.keys(global.plugins || {});
  const ar1 = rawKeys
    .map(k => k.replace(/^.*[\\/]/, '')) // strip any path
    .map(k => k.replace('.js', ''));

  const name = (text || '').trim();
  if (!name) {
    return conn.reply(
      m.chat,
      `📂 Ingresa el nombre de un plugin existente.\n\n—◉ Ejemplo:\n◉ ${usedPrefix + command} info-infobot\n\n—◉ Lista de plugins:\n◉ ${ar1.map(v => ' ' + v).join`\n◉`}`,
      m
    );
  }

  if (!ar1.includes(name)) {
    return conn.reply(
      m.chat,
      `❌ No se encontró ningún plugin llamado "${name}".\n\n—◉ Lista de plugins:\n◉ ${ar1.map(v => ' ' + v).join`\n◉`}`,
      m
    );
  }

  try {
    const filePath = `./plugins/${name}.js`;
    if (!fs.existsSync(filePath)) {
      return conn.reply(m.chat, `⚠️ El archivo ${name}.js no existe en la carpeta plugins.`, m);
    }

    // 1) Enviar el archivo .js
    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(filePath),
        mimetype: 'application/javascript',
        fileName: `${name}.js`
      },
      { quoted: m }
    );

    // 2) Importar archiver dinámicamente (compatible ESM/CJS)
    let archiver;
    try {
      const mod = await import('archiver');
      archiver = mod.default || mod;
    } catch (e) {
      // Si archiver no está disponible, terminar aquí tras enviar el .js
      return conn.reply(m.chat, 'ℹ️ ZIP no enviado: librería "archiver" no disponible.', m);
    }

    // 3) Crear ZIP y esperar a que termine
    const zipPath = `./plugins/${name}.zip`;
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(filePath, { name: `${name}.js` });
      archive.finalize();
    });

    // 4) Enviar el ZIP y borrar el temporal
    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(zipPath),
        mimetype: 'application/zip',
        fileName: `${name}.zip`
      },
      { quoted: m }
    );

    fs.unlinkSync(zipPath);
  } catch (e) {
    conn.reply(m.chat, `❌ Error al procesar el plugin: ${e.message}`, m);
  }
};

handler.help = ['getplugin'];
handler.tags = ['owner'];
handler.command = ['getplugin', 'plugin'];
handler.rowner = true;

export default handler;
