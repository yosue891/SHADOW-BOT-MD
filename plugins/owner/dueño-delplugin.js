/*
	* Create By Fede Uchiha 
	* GitHub https://github.com/the-xyzz
	* Whatsapp: https://whatsapp.com/channel/0029VbBG4i2GE56rSgXsqw2W
	* Adaptado para plugins organizados en carpetas (owner/, ia/, menus/, ...)
*/

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const RAIZ = path.join(process.cwd(), 'plugins');

// Busca un plugin por nombre de archivo en plugins/ y todas sus subcarpetas.
function buscarPlugins(nombreArchivo, dir = RAIZ, base = '', out = []) {
    let entradas = [];
    try { entradas = fsSync.readdirSync(dir, { withFileTypes: true }) } catch { return out }
    for (const e of entradas) {
        if (e.name.startsWith('.')) continue;
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) buscarPlugins(nombreArchivo, path.join(dir, e.name), rel, out);
        else if (e.name === nombreArchivo) out.push(rel);
    }
    return out;
}

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`ⓘ Por favor ingrese el nombre del plugin a eliminar.\n\n▸ Ejemplos:\n• *${usedPrefix}${command} fun-top* (lo busca en todas las carpetas)\n• *${usedPrefix}${command} fun/fun-top* (ruta completa)`);
    }

    const limpio = text.trim().replace(/\\/g, '/').replace(/^plugins\//i, '').replace(/^\.\//, '');
    if (!limpio || limpio.includes('..') || path.isAbsolute(limpio)) {
        return m.reply('❌ Ruta inválida. Solo se permiten nombres o rutas dentro de plugins/.');
    }

    const nombrePlugin = limpio.endsWith('.js') ? limpio : `${limpio}.js`;
    let relativo = limpio.includes('/') ? nombrePlugin : null;

    if (!relativo) {
        const encontrados = buscarPlugins(nombrePlugin);
        if (encontrados.length === 0) {
            return m.reply(`❌ ERROR: El plugin "${nombrePlugin}" no existe en plugins/ ni en sus carpetas.`);
        }
        if (encontrados.length > 1) {
            return m.reply(`⚠ Hay varios plugins con ese nombre:\n${encontrados.map(r => `▸ ${r}`).join('\n')}\n\nIndique la carpeta, ej: *${usedPrefix}${command} ${encontrados[0]}*`);
        }
        relativo = encontrados[0];
    }

    const ruta = path.join(RAIZ, relativo);
    if (!ruta.startsWith(RAIZ)) return m.reply('❌ Ruta inválida.');

    try {
        await fs.access(ruta, fsSync.constants.F_OK);
        await fs.unlink(ruta);
        m.reply(`🗑️ Plugin eliminado con éxito: plugins/${relativo}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return m.reply(`❌ ERROR: El plugin "${nombrePlugin}" no existe en la ruta: plugins/${relativo}`);
        }
        m.reply(`🚨 Ocurrió un error al eliminar el plugin: ${error.message}`);
    }
};

handler.help = ['delplugin', 'removeplugin'];
handler.tags = ['owner'];
handler.command = ['delplugin', 'removeplugin'];
handler.owner = true;

export default handler;
