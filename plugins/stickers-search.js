import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fluent_ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import webp from 'node-webpmux';
import * as cheerio from 'cheerio';

const tmp = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);

async function searchStickerPacks(searchTerm, limit = 1) {
  try {
    const url = `https://getstickerpack.com/stickers?query=${encodeURIComponent(searchTerm)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { status: false };
    const html = await res.text();
    const $ = cheerio.load(html);
    const packs = [];
    
    $(".sticker-pack-cols").each((i, el) => {
      if (packs.length >= limit) return;
      const linkTag = $(el).find("a");
      const packUrl = linkTag.attr("href");
      const title = $(el).find(".title").text().trim();
      const author = $(el).find(".username").text().trim() || "Shadow Garden";
      if (packUrl && title) {
        packs.push({
          title,
          author,
          url: packUrl.startsWith("http") ? packUrl : `https://getstickerpack.com${packUrl}`,
          stickers: []
        });
      }
    });

    for (const pack of packs) {
      const resPack = await fetch(pack.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const htmlPack = await resPack.text();
      const $pack = cheerio.load(htmlPack);
      $pack(".sticker-image").each((i, el) => {
        let sturl = $pack(el).attr("data-src-large") || $pack(el).attr("src");
        if (sturl) {
          if (sturl.startsWith("//")) sturl = "https:" + sturl;
          pack.stickers.push(sturl);
        }
      });
    }
    return { status: true, result: packs };
  } catch {
    return { status: false };
  }
}

async function addExif(webpSticker, packname, author) {
  const img = new webp.Image();
  const stickerPackId = crypto.randomBytes(32).toString('hex');
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['👤', '✨', '🌑']
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  await img.load(webpSticker);
  img.exif = exif;
  return await img.save(null);
}

async function urlToSticker(url, packname, author) {
  const res = await fetch(url);
  const imgBuffer = await res.buffer();
  const type = await fileTypeFromBuffer(imgBuffer);
  const tmpFile = path.join(tmp, `${Date.now()}.${type?.ext || 'png'}`);
  const outFile = path.join(tmp, `${Date.now()}.webp`);
  await fs.promises.writeFile(tmpFile, imgBuffer);

  await new Promise((resolve, reject) => {
    fluent_ffmpeg(tmpFile)
      .addOutputOptions([
        `-vcodec`, `libwebp`, `-vf`,
        `scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0`
      ])
      .toFormat('webp')
      .on('end', resolve)
      .on('error', reject)
      .save(outFile);
  });

  const buffer = await fs.promises.readFile(outFile);
  if (fs.existsSync(tmpFile)) fs.promises.unlink(tmpFile);
  if (fs.existsSync(outFile)) await fs.promises.unlink(outFile);
  return await addExif(buffer, packname, author);
}

let handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`*Ｉ ａｍ ｔｈｅ ａｌｌ-ｒａｎｇｅ ａｔｏｍｉｃ...*\n\n✐ Escribe el nombre del pack.`);

  try {
    const data = await searchStickerPacks(text, 1);
    if (!data.status || data.result.length === 0) return m.reply(`[!] Objetivo no localizado.`);

    const pack = data.result[0];
    const stickers = pack.stickers.slice(0, 10); // Límite de 10 para no saturar

    await m.reply(
      `『 **SHADOW GARDEN - ARCHIVE** 』\n\n` +
      `👤 **Autor:** ${pack.author}\n` +
      `📦 **Pack:** ${pack.title}\n\n` +
      `*Enviando ráfaga de stickers...*`
    );

    for (let st of stickers) {
      const buffer = await urlToSticker(st, pack.title, pack.author);
      await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m });
    }

  } catch (err) {
    console.error(err);
    m.reply(`[!] Error en la transmisión de datos.`);
  }
};

handler.help = ['stickersearch'];
handler.tags = ['sticker'];
handler.command = ['stickersearch', 'search'];
handler.register = false;

export default handler;
