import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import crypto from 'crypto'
import webp from 'node-webpmux'
import { generateWAMessageFromContent, downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys'

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
  circle: 'Circulo (recorte redondo)',
  crop: 'Recorte centrado 512x512',
  bw: 'Blanco y negro',
  invert: 'Invertir colores',
  blur: 'Desenfoque',
  pixel: 'Pixelado',
  sepia: 'Sepia',
  neon: 'Bordes tipo neon'
}

const listText =
  '\u25AE\u25AE _Lista de estilos_ (*s* <estilo>)\n\n' +
  Object.keys(styles).map(k => `\u2022 *s ${k}* \u2014 ${styles[k]}`).join('\n') +
  '\n\n\u2022 *s list*'

let handler = async (m, { conn, args }) => {
  const from = m.chat
  if (!from) return

  const opt = (args[0] || '').toLowerCase()

  if (opt === 'list') {
    return conn.sendMessage(from, { text: listText }, { quoted: m })
  }

  if (opt === 'details') {
    try {
      const content = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: { hasMediaAttachment: false, title: global.packsticker || 'Shadow Bot' },
              body: { text: 'Estos son todos los estilos disponibles para crear tu sticker personalizado:\n\n' +
                Object.keys(styles).map(k => `\u2022 *s ${k}* \u2014 ${styles[k]}`).join('\n') },
              nativeFlowMessage: {
                buttons: [{
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({ display_text: 'Ver estilos', url: 'https://github.com/yosue891/SHADOW-BOT-MD' })
                }]
              }
            }
          }
        }
      }
      const msg = generateWAMessageFromContent(from, content, { userJid: conn.user?.jid, quoted: m })
      await conn.relayMessage(from, msg.message, { messageId: msg.key.id })
    } catch (e) {
      await conn.sendMessage(from, { text: listText + '\n\n[DEBUG Error: ' + (e?.message || e) + ']' }, { quoted: m })
    }
    return
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/image|video/.test(mime)) {
    const helpText =
      `Hola ${m.pushName || 'usuario'}, responde a una *imagen* o *video* para crear tu sticker.\n\n` +
      `\u2022 *s circle* \u2014 circulo\n` +
      `\u2022 *s crop* \u2014 recorte 512x512\n` +
      `\u2022 *s bw* \u2014 blanco y negro\n` +
      `\u2022 *s blur* \u2014 desenfoque\n` +
      `\u2022 *s pixel* \u2014 pixelado\n` +
      `\u2022 *s neon* \u2014 bordes neon\n` +
      `\u2022 *s list* \u2014 ver todos los estilos`

    try {
      const content = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: { hasMediaAttachment: false, title: global.packsticker || 'Shadow Bot' },
              body: { text: helpText },
              nativeFlowMessage: {
                buttons: [{
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({ display_text: 'Ver detalles', id: '.s details' })
                }]
              }
            }
          }
        }
      }
      const msg = generateWAMessageFromContent(from, content, { userJid: conn.user?.jid })
      await conn.relayMessage(from, msg.message, { messageId: msg.key.id })
    } catch (e) {
      conn.sendMessage(from, { text: helpText + '\n\n[DEBUG Error: ' + (e?.message || e) + ']' }, { quoted: m })
    }
    return
  }

  const isVideo = /video/.test(mime)

  let buffer
  try {
    buffer = await q.download()
  } catch {
    try {
      buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console })
    } catch (e) {
      return conn.sendMessage(from, { text: `Error al descargar el ${isVideo ? 'video' : 'imagen'}.` }, { quoted: m })
    }
  }
  if (!buffer) {
    return conn.sendMessage(from, { text: 'No se pudo obtener el archivo multimedia.' }, { quoted: m })
  }

  const ts = Date.now()
  const input = `./tmp/temp_${ts}.${isVideo ? 'mp4' : 'jpg'}`
  const output = `./tmp/temp_${ts}.webp`

  await fs.promises.mkdir('./tmp', { recursive: true })
  await fs.promises.writeFile(input, buffer)

  const style = opt || 'circle'
  if (style && style !== '' && !styles[style]) {
    await conn.sendMessage(from, { text: listText }, { quoted: m })
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

    await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: m })
  } catch (e) {
    const err = (e?.stderr || e?.stdout || e?.message || String(e) || '').toString()
    await conn.sendMessage(from, {
      text: 'Error creando el sticker.\n\n' +
        `Estilo: *${style}*\n` +
        `Error:\n\`\`\`\n${err.slice(0, 3500)}\n\`\`\``
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
