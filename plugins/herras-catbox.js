import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";
import baileys from '@whiskeysockets/baileys'
const { generateWAMessageFromContent, generateWAMessageContent, proto } = baileys

let handler = async (m, { conn }) => {
  const emoji = '⚠️';
  const rwait = '⏳';
  const done = '✅';
  const error = '❌';

  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  if (!mime) return conn.reply(m.chat, `${emoji} *Debes responder a un archivo válido (imagen, video, etc.).*`, m);

  await m.react(rwait);

  try {
    let media = await q.download();
    if (!media || !Buffer.isBuffer(media)) {
      await m.react(error);
      return conn.reply(m.chat, `${emoji} *No se pudo descargar el archivo.*`, m);
    }

    let isImage = /image\/(png|jpe?g|gif)/.test(mime);
    let isVideo = /video\/mp4/.test(mime);
    let link = await catbox(media);

    let txt = `╔══✦🌑✦══╗
   𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍
   𝐂𝐀𝐓𝐁𝐎𝐗 𝐔𝐏𝐋𝐎𝐀𝐃𝐄𝐑
╚══✦🌑✦══╝

📂 *Enlace:* ${link}
📏 *Tamaño:* ${formatBytes(media.length)}
⏳ *Expiración:* ${isImage || isVideo ? 'No expira' : 'Desconocido'}
`;

    const mediaMsg = await generateWAMessageContent(
      isImage
        ? { image: media, caption: txt }
        : isVideo
        ? { video: media, caption: txt }
        : {
            document: media,
            mimetype: mime,
            fileName: `archivo.${mime.split('/')[1] || 'bin'}`,
            caption: txt
          },
      { upload: conn.waUploadToServer }
    );

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: { text: txt },
              footer: { text: 'Shadow Garden • Catbox Uploader' },
              header: {
                hasMediaAttachment: true,
                ...(isImage
                  ? { imageMessage: mediaMsg.imageMessage }
                  : isVideo
                  ? { videoMessage: mediaMsg.videoMessage }
                  : { documentMessage: mediaMsg.documentMessage })
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Copiar enlace',
                      copy_code: link
                    })
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Abrir enlace',
                      url: link,
                      merchant_url: link
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
      },
      { quoted: m }
    );

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    await m.react(done);

  } catch (err) {
    await m.react(error);
    conn.reply(m.chat, `${emoji} *Error al subir el archivo:*\n${err.message}`, m);
  }
};

handler.help = ['catbox'];
handler.tags = ['tools'];
handler.command = ['catbox'];
export default handler;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

async function catbox(content) {
  const fileType = await fileTypeFromBuffer(content) || {};
  const ext = fileType.ext || 'bin';
  const mime = fileType.mime || 'application/octet-stream';

  const blob = new Blob([content], { type: mime });
  const formData = new FormData();
  const randomBytes = crypto.randomBytes(5).toString("hex");

  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, randomBytes + "." + ext);

  const response = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) throw new Error(`Error en Catbox: ${response.statusText}`);
  return await response.text();
  }
