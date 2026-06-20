import fs from 'fs'
import crypto from 'crypto'
import { join } from 'path'
import { tmpdir } from 'os'

let handler = async (m, { conn, usedPrefix, command }) => {
  const owners = global.owner.map(v => v[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  if (!owners.includes(m.sender)) {
    return conn.reply(m.chat, `❌ Este es un arte prohibido reservado solo para los Maestros de la Organización.`, m)
  }

  let videoBuffer = null

  if (m.quoted && (m.quoted.isVideo || /video|ptv/.test(m.quoted.mimetype || m.quoted.msg?.mimetype || ''))) {
    try {
      videoBuffer = await m.quoted.download()
    } catch (e) {
      return conn.reply(m.chat, `❌ Falló la descarga del video respondido desde las sombras.`, m)
    }
  } else if (m.isVideo || /video|ptv/.test(m.mimetype || m.msg?.mimetype || '')) {
    try {
      videoBuffer = await m.download()
    } catch (e) {
      return conn.reply(m.chat, `❌ Falló la descarga del video principal.`, m)
    }
  }

  if (!videoBuffer) {
    return conn.reply(
      m.chat,
      `⚠️ *MODO DE USO*\n\n` +
      `> Envía un *video* o *responde a un video/audio-video* y escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  const canalId = '120363403739366547@newsletter'
  await conn.reply(m.chat, `⏳ *Transmutando transmisión... Procesando PTV en la oscuridad...*`, m)

  const filename = join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`)

  try {
    await fs.promises.writeFile(filename, videoBuffer)

    await conn.sendMessage(canalId, {
      video: { url: filename },
      mimetype: 'video/mp4',
      gifPlayback: true,
      ptv: true
    })

    await fs.promises.unlink(filename).catch(() => {})
    await m.react('🔥')
    return conn.reply(m.chat, `✅ *Misión completada.*\n\n> El video circular fue incrustado con éxito en los registros del canal.`, m)

  } catch (err) {
    if (fs.existsSync(filename)) await fs.promises.unlink(filename).catch(() => {})
    return conn.reply(m.chat, `❌ *Fallo al redirigir al canal*\n\n> ${err.message}`, m)
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true

export default handler
