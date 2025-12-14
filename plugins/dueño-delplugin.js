/*
	* Create By Fede Uchiha 
	* GitHub https://github.com/dev-fedexyro
	* Whatsapp: https://whatsapp.com/channel/0029VbBG4i2GE56rSgXsqw2W
*/

import fs from 'fs/promises';
import path from 'path';

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`\`ⓘ Por favor ingrese el nombre del plugin a eliminar.\``);
    }

    const nombrePlugin = text.endsWith('.js') ? text : `${text}.js`;
    const ruta = path.join('plugins', nombrePlugin);
    
    try {
        await fs.access(ruta, fs.constants.F_OK);
        
        await fs.unlink(ruta);
        
        m.reply(`\`🗑️ Plugin eliminado con éxito:\` ${ruta}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            return m.reply(`\`❌ ERROR: El plugin "${nombrePlugin}" no existe en la ruta:\` ${ruta}`);
        }
        m.reply(`\`🚨 Ocurrió un error al eliminar el plugin:\` ${error.message}`);
    }
};

handler.help = ['delplugin', 'removeplugin'];
handler.tags = ['owner'];
handler.command = ['delplugin', 'removeplugin'];
handler.owner = true;

export default handler;
