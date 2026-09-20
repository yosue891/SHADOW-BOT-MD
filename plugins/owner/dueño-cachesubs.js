import { promises as fs, existsSync } from 'fs';
import path from 'path';

var handler = async (m, { conn }) => {
  await conn.reply(m.chat, `Iniciando limpieza de todos los *SubBots*, manteniendo archivos importantes...`, m);
  m.react('🕓');

  const baseDir = './Sessions/SubBot/';
  try {
    if (!existsSync(baseDir)) {
      return conn.reply(m.chat, `No existe la carpeta JadiBots.`, m);
    }

    const subBots = await fs.readdir(baseDir);
    let totalDeleted = 0;

    for (const bot of subBots) {
      const botPath = path.join(baseDir, bot);
      const stat = await fs.stat(botPath);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(botPath);
      for (const file of files) {
      
        if (!['creds.json', 'config.json', 'config.js'].includes(file)) {
          const filePath = path.join(botPath, file);
          const fileStat = await fs.stat(filePath);
          try {
            if (fileStat.isDirectory()) {
              await fs.rm(filePath, { recursive: true, force: true });
            } else {
              await fs.unlink(filePath);
            }
            totalDeleted++;
          } catch (err) {
            console.error(`Error eliminando ${bot}/${file}: ${err.message}`);
          }
        }
      }
    }

    m.react(totalDeleted ? '✅' : 'ℹ️');
    await conn.reply(
      m.chat, 
      totalDeleted
        ? `> *「✿」* Limpieza completa\nArchivos eliminados: ${totalDeleted}\ncreds.json y config conservados.`
        : `No se eliminaron archivos, solo creds.json y config presentes.`,
      m
    );

  } catch (error) {
    console.error('Error limpiando subBots:', error);
    await conn.reply(m.chat, `Ocurrió un error durante la limpieza.`, m);
  }
};

handler.help = ['limpiarsubbots'];
handler.tags = ['owner'];
handler.command = ['limpiarsubbots', 'clearbots', 'cleanall'];
handler.rowner = true;

export default handler;
