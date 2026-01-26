import fetch from 'node-fetch'
import baileys from '@whiskeysockets/baileys'
const { generateWAMessageFromContent, generateWAMessageContent, proto } = baileys

const handler = async (m, { args, conn, usedPrefix, command }) => {
  try {
    const mensajes = {
      instagram: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      ig: '「✦」Por favor, proporciona un enlace válido de Instagram.',
      facebook: '「✦」Por favor, proporciona un enlace válido de Facebook.',
      fb: '「✦」Por favor, proporciona un enlace válido de Facebook.'
    };

    if (!args[0]) 
      return conn.reply(m.chat, mensajes[command] || '「✦」Por favor, proporciona un enlace válido.', m);

    let data = [];
    await m.react('🕒');

    // API 1
    try {
      const api = `${global.APIs.vreden.url}/api/igdownload?url=${encodeURIComponent(args[0])}`;
      const res = await fetch(api);
      const json = await res.json();
      if (json.resultado?.respuesta?.datos?.length) {
        data = json.resultado.respuesta.datos.map(v => v.url);
      }
    } catch {}

    // API 2 fallback
    if (!data.length) {
      try {
        const api = `${global.APIs.delirius.url}/download/instagram?url=${encodeURIComponent(args[0])}`;
        const res = await fetch(api);
        const json = await res.json();
        if (json.status && json.data?.length) {
          data = json.data.map(v => v.url);
        }
      } catch {}
    }

    if (!data.length) 
      return conn.reply(m.chat, `No se pudo obtener el contenido del enlace.`, m);

    // Miniatura estilo WhatsApp Business
    const businessHeader = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'BizHeader' },
      message: {
        locationMessage: {
          name: '𝙄𝙉𝙎𝙏𝘼𝙂𝙍𝘼𝙈 / 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 📸',
          jpegThumbnail: await (await fetch('https://files.catbox.moe/dsgmid.jpg')).buffer(),
          vcard:
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'N:;Shadow;;;\n' +
            'FN:Shadow\n' +
            'ORG:Shadow Garden\n' +
            'TITLE:\n' +
            'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
            'item1.X-ABLabel:Shadow\n' +
            'X-WA-BIZ-DESCRIPTION:Descarga invocada desde el Reino de las Sombras\n' +
            'X-WA-BIZ-NAME:Shadow Garden\n' +
            'END:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    };

    // Solo enviamos el primer archivo con estilo Business
    const mediaURL = data[0];

    const media = await generateWAMessageContent({
      video: { url: mediaURL },
      caption: `ARCHIVO EXTRAÍDO DEL REINO DIGITAL\n\n> Enlace: ${args[0]}`
    }, { upload: conn.waUploadToServer });

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: `✨ Archivo extraído correctamente\n\n> Enlace procesado:\n${args[0]}` },
            footer: { text: '⚔️ Shadow Garden' },
            header: {
              hasMediaAttachment: true,
              videoMessage: media.videoMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_copy',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Copiar enlace',
                    copy_code: args[0]
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Abrir enlace',
                    url: args[0],
                    merchant_url: args[0]
                  })
                }
              ]
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: false
            }
          })
        }
      }
    }, { quoted: businessHeader });

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    await m.react('✔️');

  } catch (error) {
    await m.react('✖️');
    await m.reply(`Ocurrió un error inesperado.\nUsa *${usedPrefix}report* para informarlo.\n\nDetalles: ${error.message}`);
  }
};

handler.command = ['instagram', 'ig', 'facebook', 'fb'];
handler.tags = ['descargas'];
handler.help = ['instagram', 'ig', 'facebook', 'fb'];

export default handler;
