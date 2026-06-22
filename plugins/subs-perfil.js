import fetch from 'node-fetch';
import Jimp from 'jimp'

const handler = async (m, { conn, command, usedPrefix, text }) => {
  const isSubBots = [conn.user.jid, ...global.owner.map(([number]) => `${number}@s.whatsapp.net`)].includes(m.sender);
  if (!isSubBots) return m.reply(`「✦」El comando *${command}* está restringido. Solo puede ser ejecutado por el Socket o propietarios autorizados.`);

  try {
    const value = text ? text.trim() : '';

    switch (command) {
      case 'setpfp':
      case 'setimg': {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || '';
        if (!/image\/(png|jpe?g)/.test(mime)) {
          return conn.reply(m.chat, `✐ Por favor, responde o envía una imagen válida en formato PNG o JPEG para actualizar la foto de perfil.`, m);
        }

        const media = await q.download();
        if (!media) return conn.reply(m.chat, `ꕥ No se pudo obtener la imagen.`, m);

        const image = await Jimp.read(media);
        const buffer = await image.getBufferAsync('image/jpeg');
        await conn.updateProfilePicture(conn.user.jid, buffer);

        conn.reply(m.chat, `❒ La foto de tu perfil ha sido actualizada correctamente.`, m);
        break;
      }

      case 'setstatus':
      case 'setbio': {
        if (!text) return conn.reply(m.chat, `✐ Ingresa el texto que deseas establecer como nueva biografía.`, m);
        await conn.updateProfileStatus(text);
        conn.reply(m.chat, `❒ Biografía actualizada correctamente:\n> 🜸 *"${text}"*`, m);
        break;
      }

      case 'setusername':
      case 'setuser': {
        if (!value) return conn.reply(m.chat, `✐ Ingresa el nuevo nombre de usuario que deseas establecer.`, m);
        if (value.length < 3 || value.length > 25) {
          return conn.reply(m.chat, `ꕥ El nombre debe contener entre 3 y 25 caracteres.`, m);
        }
        await conn.updateProfileName(value);
        m.reply(`❒ Nombre de usuario actualizado correctamente:\n> ✐ *${value}*`);
        break;
      }
    }
  } catch (error) {
    m.reply(`⚠︎ Ocurrió un error inesperado.\n> Si el problema persiste, repórtalo usando *${usedPrefix}report*.\n\n🜸 Detalles: ${error.message}`);
  }
};

handler.help = ['setpfp', 'setbio', 'setuser'];
handler.tags = ['serbot'];
handler.command = ['setpfp', 'setimage', 'setstatus', 'setbio', 'setusername', 'setuser'];

export default handler;
