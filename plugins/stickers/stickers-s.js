import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import crypto from 'crypto'

const execAsync = util.promisify(exec)

let ffmpegPathCache = null
async function obtenerRutaFfmpeg() {
  if (ffmpegPathCache) return ffmpegPathCache
  if (process.env.FFMPEG_PATH) {
    ffmpegPathCache = process.env.FFMPEG_PATH
    return process.env.FFMPEG_PATH
  }
  try {
    await execAsync('ffmpeg -version')
    ffmpegPathCache = 'ffmpeg'
    return 'ffmpeg'
  } catch {
    try {
      const installer = await import('@ffmpeg-installer/ffmpeg')
      const ruta = installer?.default?.path || installer?.path
      if (ruta) {
        ffmpegPathCache = ruta
        return ruta
      }
    } catch {}
  }
  ffmpegPathCache = 'ffmpeg'
  return 'ffmpeg'
}

let webpModule = null
async function getWebp() {
  if (webpModule) return webpModule
  try {
    webpModule = await import('node-webpmux').then(m => m.default || m).catch(() => null)
    return webpModule
  } catch {
    return null
  }
}

async function addExif(webpBuffer, packname, author) {
  try {
    const webp = await getWebp()
    if (webp) {
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
  } catch {}

  try {
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

    const exifIndex = webpBuffer.indexOf(Buffer.from('EXIF'))
    if (exifIndex !== -1) {
      const oldExifSize = webpBuffer.readUInt32LE(exifIndex + 4)
      const padding = oldExifSize % 2 === 1 ? 1 : 0
      const before = webpBuffer.slice(0, exifIndex - 4)
      const after = webpBuffer.slice(exifIndex + 8 + oldExifSize + padding)
      const exifChunkId = Buffer.from('EXIF')
      const exifSize = Buffer.alloc(4)
      exifSize.writeUInt32LE(exif.length)
      const pad = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
      const newChunk = Buffer.concat([exifChunkId, exifSize, exif, pad])
      const total = Buffer.concat([before, newChunk, after])
      total.writeUInt32LE(total.length - 8, 4)
      return total
    }

    const riffHeader = webpBuffer.slice(0, 4)
    const webpSignature = webpBuffer.slice(8, 12)
    const webpData = webpBuffer.slice(12)
    const exifChunkId = Buffer.from('EXIF')
    const exifSize = Buffer.alloc(4)
    exifSize.writeUInt32LE(exif.length)
    const pad = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
    const exifChunk = Buffer.concat([exifChunkId, exifSize, exif, pad])
    const newWebpData = Buffer.concat([webpData, exifChunk])
    const newFileSize = Buffer.alloc(4)
    newFileSize.writeUInt32LE(4 + newWebpData.length)
    return Buffer.concat([riffHeader, newFileSize, webpSignature, newWebpData])
  } catch {
    return webpBuffer
  }
}

const styles = {
  normal: 'Normal (ajuste proporcional completo)',
  crop: 'Recorte centrado 512x512',
  circle: 'Círculo (recorte redondo)',
  bw: 'Blanco y negro',
  invert: 'Invertir colores',
  blur: 'Desenfoque',
  pixel: 'Pixelado',
  sepia: 'Sepia',
  neon: 'Bordes tipo neon'
}

const listText =
  '\u25AE\u25AE _Lista de estilos_ (*s* <estilo>)\n\n' +
  Object.keys(styles).map(k => '\u2022 *s ' + k + '* \u2014 ' + styles[k]).join('\n') +
  '\n\n\u2022 *s list*'

let handler = async (m, { conn, args }) => {
  const from = m.chat
  if (!from) return

  const rawOpt = (args[0] || '').toLowerCase().trim()
  const opt = rawOpt.replace(/^--?/, '')

  if (opt === 'list') {
    return conn.sendMessage(from, { text: listText }, { quoted: m })
  }

  if (opt === 'details') {
    try {
      const detailText =
        '🎃🦇 _Shadow Garden • Sellos Arcanos de Halloween_\n\n' +
        'Estos son los estilos oscuros disponibles para forjar tu sello personalizado:\n\n' +
        Object.keys(styles).map(k => '🕯️ *s ' + k + '* \u2014 ' + styles[k]).join('\n')
      await conn.relayMessage(from, {
        interactiveMessage: {
          header: { title: '🎃 Shadow Garden • Halloween 🦇' },
          body: { text: detailText },
          nativeFlowMessage: {
            buttons: [{ name: 'inapp_signup', buttonParamsJson: '{}' }],
            messageParamsJson: ''
          },
          contextInfo: {}
        }
      }, { quoted: m })
    } catch (e) {
      await conn.sendMessage(from, { text: listText }, { quoted: m })
    }
    return
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/image|video/.test(mime)) {
    const helpText =
      '🎃 Hola ' + (m.pushName || 'contratista') + ', responde a una *imagen* o *video* para forjar tu sello sombrío en Halloween 🦇\n\n' +
      'Presiona el botón de *Ver detalles* para ver todas las formas disponibles en el aquelarre 🕯️'

    try {
      await conn.relayMessage(from, {
        interactiveMessage: {
          header: { title: global.packsticker || 'Shadow Bot' },
          body: { text: helpText },
          nativeFlowMessage: {
            buttons: [{
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: 'Ver detalles', id: '.s details' })
            }],
            messageParamsJson: ''
          },
          contextInfo: {}
        }
      }, { quoted: m })
    } catch (e) {
      await conn.sendMessage(from, { text: helpText }, { quoted: m })
    }
    return
  }

  const isVideo = /video/.test(mime)

  let buffer
  try {
    buffer = await q.download()
  } catch {
    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
      buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console })
    } catch (e) {
      return conn.sendMessage(from, { text: 'Error al descargar el ' + (isVideo ? 'video' : 'imagen') + '.' }, { quoted: m })
    }
  }
  if (!buffer) {
    return conn.sendMessage(from, { text: 'No se pudo obtener el archivo multimedia.' }, { quoted: m })
  }

  const ts = Date.now()
  const input = './tmp/temp_' + ts + '.' + (isVideo ? 'mp4' : 'jpg')
  const output = './tmp/temp_' + ts + '.webp'

  await fs.promises.mkdir('./tmp', { recursive: true })
  await fs.promises.writeFile(input, buffer)

  let style = 'normal'
  if (['circle', 'circulo', 'círculo', 'r', 'redondo'].includes(opt)) {
    style = 'circle'
  } else if (['crop', 'c', 'recorte', 'cuadrado'].includes(opt)) {
    style = 'crop'
  } else if (styles[opt]) {
    style = opt
  } else if (opt && opt !== 'normal' && opt !== 'default' && opt !== 'full') {
    await conn.sendMessage(from, { text: listText }, { quoted: m })
    if (fs.existsSync(input)) await fs.promises.unlink(input)
    return
  }

  const targetFps = isVideo ? 10 : 15
  const baseContain =
    `fps=${targetFps},` +
    'scale=512:512:force_original_aspect_ratio=decrease,' +
    'format=rgba,' +
    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0'

  const baseCoverCrop =
    `fps=${targetFps},` +
    'scale=512:512:force_original_aspect_ratio=increase,' +
    'crop=512:512'

  const geqCircle = "geq=lum='p(X,Y)':a='if(lte(hypot(X-256,Y-256),256),255,0)'"

  const vf =
    style === 'normal' ? baseContain :
    style === 'circle' ? (baseCoverCrop + ',format=rgba,' + geqCircle) :
    style === 'crop' ? baseCoverCrop :
    style === 'bw' ? (baseContain + ',hue=s=0') :
    style === 'invert' ? (baseContain + ',negate') :
    style === 'blur' ? (baseContain + ',gblur=sigma=6') :
    style === 'pixel' ? (baseContain + ',scale=128:128:flags=neighbor,scale=512:512:flags=neighbor') :
    style === 'sepia' ? (baseContain + ',colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131') :
    style === 'neon' ? (baseContain + ',edgedetect=low=0.08:high=0.2') :
    baseContain

  const ffmpegBin = await obtenerRutaFfmpeg()
  const ffmpegCmd = isVideo
    ? `"${ffmpegBin}" -y -i "${input}" -t 45 -an -vf "${vf}" -loop 0 -q:v 30 -lossless 0 -compression_level 4 -vsync 0 "${output}"`
    : `"${ffmpegBin}" -y -i "${input}" -an -vf "${vf}" -loop 0 -vsync 0 "${output}"`

  try {
    await execAsync(ffmpegCmd)

    if (isVideo && fs.existsSync(output)) {
      const stats = await fs.promises.stat(output)
      if (stats.size > 950 * 1024) {
        const fallbackVf =
          style === 'circle'
            ? ('fps=8,scale=384:384:force_original_aspect_ratio=increase,crop=384:384,format=rgba,geq=lum=\'p(X,Y)\':a=\'if(lte(hypot(X-192,Y-192),192),255,0)\'')
            : style === 'crop'
            ? 'fps=8,scale=384:384:force_original_aspect_ratio=increase,crop=384:384'
            : 'fps=8,scale=384:384:force_original_aspect_ratio=decrease,format=rgba,pad=384:384:(ow-iw)/2:(oh-ih)/2:color=white@0.0'
        const fallbackCmd = `"${ffmpegBin}" -y -i "${input}" -t 45 -an -vf "${fallbackVf}" -loop 0 -q:v 20 -lossless 0 -compression_level 4 -vsync 0 "${output}"`
        await execAsync(fallbackCmd).catch(() => {})
      }
    }

    let stickerBuffer = await fs.promises.readFile(output)

    const packName = global.packsticker || global.wm || 'Shadow Bot'
    const author = global.dev || 'yosue'
    try {
      stickerBuffer = await addExif(stickerBuffer, packName, author)
    } catch (exifErr) {
      console.error('Error aplicando exif al sticker:', exifErr)
    }

    await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: m })
  } catch (e) {
    const err = (e?.stderr || e?.stdout || e?.message || String(e) || '').toString()
    await conn.sendMessage(from, {
      text: 'Error creando el sticker.\n\nEstilo: *' + style + '*\nError:\n```\n' + err.slice(0, 3500) + '\n```'
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
