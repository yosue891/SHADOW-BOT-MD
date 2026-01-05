import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import fluent_ffmpeg from 'fluent-ffmpeg'
import fetch from 'node-fetch'
import { fileTypeFromBuffer } from 'file-type'
import webp from 'node-webpmux'
import axios from 'axios'

const tmp = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp)

async function addExif(webpSticker, packname, author, categories = [''], extra = {}) {
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
      `-vcodec`, `libwebp`, `-vf`,
      `scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
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

const handler = async (m, { conn, args }) => {
  let texto = args.length >= 1 ? args.join(' ') : m.quoted?.text
  if (!texto) return m.reply('𖣣⌗ Por favor escribe o responde a un texto para generar la cita')
  if (texto.length > 100) return m.reply('⊹ᘏ El texto no puede superar los *100 caracteres*')

  let quien = m.quoted ? m.quoted.sender : m.sender
  let nombre = m.quoted ? m.quoted.name : m.name
  let fotoPerfil = await conn.profilePictureUrl(quien, 'image').catch(_ => 'https://telegra.ph/file/320b066dc81928b782c7b.png')

  let nombrePack = global.packname || '✦ Michi - AI ✦'
  try {
    const botActual = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
    const configPath = path.join('./Sessions/SubBot', botActual, 'config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.name) nombrePack = config.name
    }
  } catch (err) {
    console.log('⚠️ No se pudo leer config del subbot:', err)
  }

  await m.react('🕒')

  try {
    const datos = {
      type: 'quote',
      format: 'png',
      backgroundColor: '#000000',
      width: 512,
      height: 768,
      scale: 2,
      messages: [{
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: nombre,
          photo: { url: fotoPerfil }
        },
        text: texto,
        replyMessage: {}
      }]
    }

    const res = await axios.post('https://qc.botcahx.eu.org/generate', datos, {
      headers: { 'Content-Type': 'application/json' }
    })

    const imgBuffer = Buffer.from(res.data.result.image, 'base64')
    const stiker = await sticker(imgBuffer, false, nombrePack, global.dev || '© Made with ☁︎ yosue,ado✧')

    await conn.sendMessage(m.chat, { sticker: stiker, ...global.rcanal }, { quoted: m })
    await m.react('✅')
  } catch (e) {
    console.error(e)
    await m.react('❌')
    await conn.sendMessage(m.chat, {
      text: `✎ *Error al generar la cita*\nIntenta nuevamente`,
      ...global.rcanal
    }, { quoted: m })
  }
}

handler.help = ['qc']
handler.tags = ['sticker']
handler.command = ['qc']
handler.register = false
handler.coin = 3

export default handler
