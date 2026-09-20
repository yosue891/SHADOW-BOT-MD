import fs from 'fs'
import path from 'path'
import { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

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
      ` *MODO DE USO*\n\n` +
      `> Envía un *video* o *responde a un video* y escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  await conn.reply(
    m.chat,
    ' *Convirtiendo el video a PTV...*',
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
      throw new Error('No se pudo descargar el video.')
    }
  } catch (e) {
    console.error(e)
    return conn.reply(
      m.chat,
      `Error al descargar el video.\n\n> ${e.message || e}`,
      m
    )
  }

  const dir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tempPath = path.join(dir, `ptv_${Date.now()}.mp4`)

  try {
    await fs.promises.writeFile(tempPath, video)

    const content = await generateWAMessageContent(
      { video: { url: tempPath }, ptv: true },
      { upload: conn.waUploadToServer }
    )

    const quotedMsg = m.quoted || m
    const quotedType = quotedMsg.mtype || m.mtype
    const quotedContent = quotedMsg.msg || quotedMsg

    if (quotedContent && quotedType) {
      content.ptvMessage.contextInfo = {
        stanzaId: quotedMsg.id || m.id,
        participant: quotedMsg.sender || m.sender,
        quotedMessage: proto.Message.create({ [quotedType]: quotedContent })
      }
      if (m.chat !== (quotedMsg.chat || m.chat)) {
        content.ptvMessage.contextInfo.remoteJid = quotedMsg.chat
      }
    }

    const msg = generateWAMessageFromContent(m.chat, content, { userJid: conn.user.id })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    if (m.react) await m.react('✅')
  } catch (err) {
    console.error(err)
    return conn.reply(
      m.chat,
      `Error al enviar el PTV.\n\n> ${err.message || err}`,
      m
    )
  } finally {
    if (fs.existsSync(tempPath)) {
      await fs.promises.unlink(tempPath).catch(console.error)
    }
  }
}

handler.help = ['ptv']
handler.tags = ['tools']
handler.command = ['ptv', 'pvideo', 'circlevideo']
handler.register = true

export default handler
