import fs from 'fs'
import path from 'path'
import { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

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
    return m.reply(
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
      `> Envía *video* o *responde video* luego escribe:\n` +
      `> \`${usedPrefix + command}\``
    )
  }

  const canalId = '120363403739366547@newsletter'

  await m.reply(`⏳ *ᴍblockᴇblockɴblockɢblockɪblockʀblockɪblockᴍ ᴘblockᴛblockᴠ...*`)

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
    return m.reply(`❌ Fallo descarga video.\n\n> ${e.message}`)
  }

  const dir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tempPath = path.join(dir, `ptv_${Date.now()}.mp4`)

  try {
    await fs.promises.writeFile(tempPath, video)

    const content = await generateWAMessageContent(
      { video: { url: tempPath }, ptv: true },
      {
        jid: canalId,
        upload: async (readStream, opts) => {
          const up = await conn.waUploadToServer(readStream, {
            ...opts,
            newsletter: true
          })
          return up
        }
      }
    )

    const msg = generateWAMessageFromContent(canalId, content, { userJid: conn.user.id })

    await conn.relayMessage(canalId, msg.message, { messageId: msg.key.id })

    await m.react('✅')
    return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video éxito dikirim ke channel sebagai PTV.`)
  } catch (err) {
    return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Error: ${err.message}`)
  } finally {
    if (fs.existsSync(tempPath)) {
      await fs.promises.unlink(tempPath).catch(console.error)
    }
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true
handler.isOwner = false 
handler.isPremium = false
handler.isGroup = false
handler.isPrivate = false
handler.cooldown = 5

export default handler
