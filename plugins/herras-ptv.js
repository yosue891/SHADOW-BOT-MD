import { generateWAMessageFromContent, generateWAMessageContent, downloadContentFromMessage } from '@whiskeysockets/baileys'

const pluginConfig = {
  description: 'Envía un video como nota de video circular (PTV).',
  cooldown: 5,
  energi: 1,
  isEnabled: true
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = ''
  let mediaMsg = null

  if (m.quoted) {
    let msgObj = m.quoted.mediaMessage || m.quoted.msg
    if (msgObj) {
      let type = Object.keys(msgObj)[0]
      mediaMsg = msgObj[type]
      mime = mediaMsg?.mimetype || ''
    }
  }
  if (!mediaMsg) {
    mediaMsg = m.msg || q
    mime = mediaMsg?.mimetype || ''
  }

  if (!mime || !mime.startsWith('video/')) {
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
    const messageType = mime.split('/')[0]
    const stream = await downloadContentFromMessage(mediaMsg, messageType)
    let buffer = Buffer.from([])

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    video = buffer

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
    const content = await generateWAMessageContent(
      { video, ptv: true },
      { upload: conn.waUploadToServer }
    )

    const msg = generateWAMessageFromContent(m.chat, content, { quoted: m })

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
