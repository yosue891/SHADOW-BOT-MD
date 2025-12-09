import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { FormData, Blob } from 'formdata-node';
import { fileTypeFromBuffer } from 'file-type';

const handler = async (m, { conn, text }) => {
  let buffer;
  try {
    if (m.quoted && (m.quoted.msg || {}).mimetype?.startsWith('image/')) {
      
      buffer = await m.quoted.download();
    } else if (text && text.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif)$/i)) {
      
      const res = await fetch(text);
      if (!res.ok) throw new Error(`🌑🎄 Las Sombras festivas no pudieron descargar la imagen...`);
      buffer = await res.buffer();
    } else {
      return m.reply(`❌🌑🎄 *Responde a una imagen o envía un link directo válido con el comando* _.comprimir_ 🎅`);
    }

    m.react('🎄');

    const urlCatbox = await catbox(buffer); 

    const apiURL = `https://api.siputzx.my.id/api/iloveimg/compress?image=${encodeURIComponent(urlCatbox)}`;
    const response = await fetch(apiURL);
    if (!response.ok) throw new Error(`🌑🎄 Error sombrío navideño HTTP ${response.status}`);
    const compressed = await response.buffer();

    await conn.sendMessage(m.chat, {
      image: compressed,
      caption: `> 🌕🎄 *Imagen comprimida por las Sombras festivas* 🎄🌑\n> ✨ *Optimizada en el Reino de LoveIMG*`
    }, { quoted: m });

    m.react('✅');
  } catch (err) {
    console.error(err);
    m.react('❌');
    m.reply(`✖️🌑🎄 *El ritual sombrío navideño falló al comprimir la imagen.*\n\n🪵 *Detalle sombrío:* ${err.message}`);
  }
};

handler.help = ['comprimir'];
handler.tags = ['herramientas'];
handler.command = ['compress', 'comprimir'];

export default handler;

async function catbox(content) {
  const { ext, mime } = (await fileTypeFromBuffer(content)) || {};
  const blob = new Blob([content.toArrayBuffer()], { type: mime });
  const formData = new FormData();
  const random = crypto.randomBytes(5).toString('hex');
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', blob, `${random}.${ext}`);

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android)',
    }
  });

  return await res.text();
  }
