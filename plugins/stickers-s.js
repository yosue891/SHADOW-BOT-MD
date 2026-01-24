import fetch from 'node-fetch'
import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const execAsync = util.promisify(exec)

let handler = async (m, { conn, args, usedPrefix, command }) => {

  const chat = global.db.data.users[m.sender] || {}

  // REGISTRO ELIMINADO — NO SE TOCÓ NADA MÁS

  const from = m?.chat || m?.key?.remoteJid
  if (!from) return

  const opt = (args?.[0] || '').toLowerCase()

  const styles = {
    circle: 'Círculo (recorte redondo)',
    crop: 'Recorte centrado 512x512',
    bw: 'Blanco y negro',
    invert: 'Invertir colores',
    blur: 'Desenfoque',
    pixel: 'Pixelado',
    sepia: 'Sepia',
    neon: 'Bordes tipo neón'
  }

  const listText =
    `「✦」𝗟𝗶𝘀𝘁𝗮 𝗱𝗲 𝗲𝘀𝘁𝗶𝗹𝗼𝘀 (${usedPrefix + command} <estilo>)\n\n` +
    Object.keys(styles).map(k => `• ${usedPrefix + command} ${k} — ${styles[k]}`).join('\n') +
    `\n\n• ${usedPrefix + command} list`

  if (opt === 'list') {
    return await conn.sendMessage(from, { text: listText }, { quoted: m })
  }

  const ctx = m?.message?.extendedTextMessage?.contextInfo
  const quotedMsg = ctx?.quotedMessage?.message || ctx?.quotedMessage || null

  const imageMessage = m?.message?.imageMessage || quotedMsg?.imageMessage || null
  const videoMessage = m?.message?.videoMessage || quotedMsg?.videoMessage || null

  const isImage = !!imageMessage
  const isVideo = !!videoMessage

  if (!isImage && !isVideo) {
    return await conn.sendMessage(
      from,
      {
        text:
          '「✦」Responde a una *imagen* o *video* para crear el sticker.\n' +
          `> ✐ Ejemplo » *${usedPrefix + command} circle*\n` +
          `> ✐ Lista » *${usedPrefix + command} list*`
      },
      { quoted: m }
    )
  }

  const msg = isImage ? imageMessage : videoMessage
  const dlType = isImage ? 'image' : 'video'

  const stream = await downloadContentFromMessage(msg, dlType)

  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

  const ts = Date.now()
  const input = `./temp_${ts}.${isImage ? 'jpg' : 'mp4'}`
  const output = `./temp_${ts}.webp`

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
    const sticker = await fs.promises.readFile(output)
    await conn.sendMessage(from, { sticker }, { quoted: m })
  } catch (e) {
    const err = (e?.stderr || e?.stdout || e?.message || String(e) || '').toString()
    await conn.sendMessage(
      from,
      {
        text:
          '「✦」Error creando el sticker.\n\n' +
          `> ✐ Estilo: *${style}*\n` +
          `> ✐ ffmpeg: \`${ffmpegCmd}\`\n\n` +
          `> ✐ Error:\n\`\`\`\n${err.slice(0, 3500)}\n\`\`\``
      },
      { quoted: m }
    )
  } finally {
    if (fs.existsSync(input)) await fs.promises.unlink(input)
    if (fs.existsSync(output)) await fs.promises.unlink(output)
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['sticker', 's', 'stiker']

export default handler
