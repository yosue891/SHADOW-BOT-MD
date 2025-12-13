// Codigo de @WILKER-OFC y no quites creditos   
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import fluent_ffmpeg from 'fluent-ffmpeg'
import fetch from 'node-fetch'
import { fileTypeFromBuffer } from 'file-type'
import webp from 'node-webpmux'

const tmp = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp)

async(webpSticker, packname, author, categories = [''], extra = {}) {
  const img = new webp.Image()
  const stickerPackId = crypto.randomBytes(32).toString('hex')
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': categories,
    ...extra
  }
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  await img.load(webpSticker)
  img.exif = exif
  return await img.save(null)
}

async function sticker(img, url, packname, author) {
  if (url) {
    let res = await fetch(url)
    if (res.status !== 200) throw await res.text()
    img = await res.buffer()
  }
  const type = await fileTypeFromBuffer(img) || { mime: 'application/octet-stream', ext: 'bin' }
  if (type.ext === 'bin') throw new Error('Tipo de archivo inválido')

  const tmpFile = path.join(tmp, `${Date.now()}.${type.ext}`)
  const outFile = `${tmpFile}.webp`
  await fs.promises.writeFile(tmpFile, img)

  await new Promise((resolve, reject) => {
    const ff = /video/i.test(type.mime)
      ? fluent_ffmpeg(tmpFile).inputFormat(type.ext)
      : fluent_ffmpeg(tmpFile).input(tmpFile)

    ff.addOutputOptions([
      '-vcodec', 'libwebp', '-vf',
      "scale='min(512,iw)':min'(512,ih)':forceoriginalaspectratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reservetransparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
    ])
      .toFormat('webp')
      .save(outFile)
      .on('error', reject)
      .on('end', resolve)
  })

  const buffer = await fs.promises.readFile(outFile)
  fs.promises.unlink(tmpFile).catch(() => {})
  fs.promises.unlink(outFile).catch(() => {})

  return await addExif(buffer, packname, author)
}

// Nuevo comando bratv
const bratv = async (m, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(m.chat, { text: '✦ Ingresa un texto para generar el vídeo brat' }, { quoted: m })
  }

  await m.react('🕒')
  try {
    const apiUrl = `https://mayapi.ooguy.com/bratvideo?text=${encodeURIComponent(text)}&apikey=may-d9b9c688`
    const res = await fetch(apiUrl)
    const json = await res.json()

    if (!json.status || !json.result) throw new Error('Error en la API')

    const videoUrl = json.result
    const packname = global.packname || 'MaycolPlus • Bot kwai :3'
    const author = global.author || 'SoyMaycol • 51921826291'

    const stiker = await sticker(false, videoUrl, packname, author)

    await conn.sendMessage(m.chat, { sticker: stiker, ...global.rcanal }, { quoted: m })
    await m.react('✅')
  } catch (e) {
    console.error(e)
    await m.react('❌')
    await conn.sendMessage(
      m.chat,
      { text: '✘ No se pudo generar el sticker de vídeo brat', ...global.rcanal },
      { quoted: m }
    )
  }
}

bratv.help = ['bratv <texto>']
bratv.tags = ['sticker']
bratv.command = ['bratv']

export default bratv
