import baileys from '@whiskeysockets/baileys'
const { generateWAMessageFromContent, proto } = baileys

const pluginConfig = {
  description: 'Envía un video como nota de video circular (PTV).',
  cooldown: 5,
  energi: 1,
  isEnabled: true
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime.startsWith('video/')) {
    return conn.reply(
      m.chat,
      `[ 🕸️ ] *MODO DE USO REQUERIDO*\n\n` +
      `> Envía un *video* o *responde a uno* y desata el poder con:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  await conn.reply(
    m.chat,
    '[ ⏳ ] *Canalizando la energía... Convirtiendo el video a nota circular (PTV)...*',
    m
  )

  let video
  try {
    video = await q.download?.()

    if (!video || video.length < 1) {
      throw new Error('Las sombras no pudieron extraer el flujo de video.')
    }
  } catch (e) {
    console.error(e)
    return conn.reply(
      m.chat,
      `[ 🩸 ] Fallo al descargar el recuerdo visual.\n\n> ${e.message || e}`,
      m
    )
  }

  try {
    const upload = await conn.waUploadToServer(video, { mimetype: 'video/mp4' })
    
    const msg = generateWAMessageFromContent(m.chat, {
      videoMessage: proto.VideoMessage.fromObject({
        url: upload.url,
        directPath: upload.directPath,
        mediaKey: upload.mediaKey,
        mimetype: 'video/mp4',
        fileEncSha256: upload.fileEncSha256,
        fileSha256: upload.fileSha256,
        fileLength: upload.fileLength,
        ptv: true
      })
    }, { quoted: m })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await m.react('⚔️')
    
  } catch (err) {
    console.error(err)
    return conn.reply(
      m.chat,
      `[ 🩸 ] Las sombras colapsaron al proyectar el PTV.\n\n> ${err.message || err}`,
      m
    )
  }
}

handler.help = ['ptv']
handler.tags = ['tools']
handler.command = ['ptv', 'pvideo', 'circlevideo']
handler.register = true

export default handler
