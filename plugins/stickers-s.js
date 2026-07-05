import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import crypto from 'crypto'
import webp from 'node-webpmux'

const execAsync = util.promisify(exec)

async function addExif(webpBuffer, packname, author) {
  const img = new webp.Image()
  const stickerPackId = crypto.randomBytes(32).toString('hex')
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['\u{1F916}']
  }
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  await img.load(webpBuffer)
  img.exif = exif
  return await img.save(null)
}

const styles = {
  circle: 'C\u00edrculo (recorte redondo)',
  crop: 'Recorte centrado 512x512',
  bw: 'Blanco y negro',
  invert: 'Invertir colores',
  blur: 'Desenfoque',
  pixel: 'Pixelado',
  sepia: 'Sepia',
  neon: 'Bordes tipo ne\u00f3n'
}

const listText =
  '\u25AE\u25AE _Lista de estilos_ (*s* <estilo>)\n\n' +
  Object.keys(styles).map(k => `\u2022 *s ${k}* \u2014 ${styles[k]}`).join('\n') +
  '\n\n\u2022 *s list*'

let handler = async (m, { conn, args, command }) => {
  const opt = (args[0] || '').toLowerCase()

  if (opt === 'list') {
    return conn.sendMessage(m.chat, { text: listText }, { quoted: m })
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/image|video/.test(mime)) {
    const helpText =
      `Hola ${m.pushName || 'usuario'}, responde a una *imagen* o *video* para crear tu sticker.\n\n` +
      Object.keys(styles).map(k => `\u2022 *${command} ${k}* \u2014 ${styles[k]}`).join('\n') +
      `\n\u2022 *${command} list* \u2014 ver todos los estilos`
    return conn.sendMessage(m.chat, { text: helpText }, { quoted: m })
  }

  await m.react('🕒')

  const isVideo = /video/.test(mime)
  const msg = q.msg || q

  let buffer
  try {
    buffer = await q.download()
  } catch {
    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
      buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console, reconnectMode: 'on' })
    } catch (e) {
      await m.react('✖️')
      return conn.sendMessage(m.chat, { text: `Error al descargar el ${isVideo ? 'video' : 'imagen'}.` }, { quoted: m })
    }
  }
  if (!buffer) {
    await m.react('✖️')
    return conn.sendMessage(m.chat, { text: 'No se pudo obtener el archivo multimedia.' }, { quoted: m })
  }

  const ts = Date.now()
  const input = `./tmp/temp_${ts}.${isVideo ? 'mp4' : 'jpg'}`
  const output = `./tmp/temp_${ts}.webp`

  await fs.promises.mkdir('./tmp', { recursive: true })
  await fs.promises.writeFile(input, buffer)

  const style = opt || 'circle'
  if (style && style !== '' && !styles[style]) {
    await conn.sendMessage(m.chat, { text: listText }, { quoted: m })
    if (fs.existsSync(input)) await fs.promises.unlink(input)
    return
  }

  const baseContain =
    'fps=15,' +
    'scale=512:512:force_original_aspect_ratio=decrease,' +
    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0'

  const baseCoverCrop =
    'fps=15,' +
    'scale=512:512:force_original_aspect_ratio=increase,' +
    'crop=512:512'

  const geqCircle = "geq=lum='p(X,Y)':a='if(lte(hypot(X-256,Y-256),256),255,0)'"

  const vf =
    style === 'circle' ? `${baseCoverCrop},format=rgba,${geqCircle}` :
    style === 'crop' ? baseCoverCrop :
    style === 'bw' ? `${baseContain},hue=s=0` :
    style === 'invert' ? `${baseContain},negate` :
    style === 'blur' ? `${baseContain},gblur=sigma=6` :
    style === 'pixel' ? `${baseContain},scale=128:128:flags=neighbor,scale=512:512:flags=neighbor` :
    style === 'sepia' ? `${baseContain},colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131` :
    style === 'neon' ? `${baseContain},edgedetect=low=0.08:high=0.2` :
    `${baseCoverCrop},format=rgba,${geqCircle}`

  const ffmpegCmd = isVideo
    ? `ffmpeg -y -i "${input}" -t 8 -an -vf "${vf}" -loop 0 -fps_mode passthrough "${output}"`
    : `ffmpeg -y -i "${input}" -an -vf "${vf}" -loop 0 -fps_mode passthrough "${output}"`

  try {
    await execAsync(ffmpegCmd)
    let stickerBuffer = await fs.promises.readFile(output)

    const packName = global.packsticker || 'Shadow Bot'
    const author = global.dev || 'yosue'
    stickerBuffer = await addExif(stickerBuffer, packName, author)

    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
    await m.react('✔️')
  } catch (e) {
    const err = (e?.stderr || e?.stdout || e?.message || String(e) || '').toString()
    await m.react('✖️')
    await conn.sendMessage(m.chat, {
      text: `Error creando el sticker.\n\nEstilo: *${style}*\nError:\`\`\`\n${err.slice(0, 3500)}\n\`\`\``
    }, { quoted: m })
  } finally {
    if (fs.existsSync(input)) await fs.promises.unlink(input)
    if (fs.existsSync(output)) await fs.promises.unlink(output)
  }
}

handler.help = ['sticker', 's', 'stiker']
handler.tags = ['sticker']
handler.command = ['sticker', 's', 'stiker']

export default handler
