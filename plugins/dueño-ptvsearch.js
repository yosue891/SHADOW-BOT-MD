import fs from 'fs'
import path from 'path'
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, usedPrefix, command }) => {
  let video = null
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (m.quoted && (/video|ptv/.test(mime) || m.quoted.isVideo)) {
    try {
      video = await m.quoted.download()
    } catch (e) {
      return m.reply(`❌ Fallo descarga video de quoted.`)
    }
  } else if (/video|ptv/.test(mime) || m.isVideo) {
    try {
      video = await m.download()
    } catch (e) {
      return m.reply(`❌ Fallo descarga video.`)
    }
  }

  if (!video) {
    return m.reply(
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
      `> Envía *video* o *responde video* lalu escribe:\n` +
      `> \`${usedPrefix + command}\``
    )
  }

  const canalId = '120363403739366547@newsletter'

  await m.reply(`⏳ *ᴍblockᴇblockɴblockɢblockɪblockʀblockɪblockᴍ ᴘblockᴛblockᴠ...*`)

  const dir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tempPath = path.join(dir, `ptv_${Date.now()}.mp4`)

  try {
    await fs.promises.writeFile(tempPath, video)

    const content = await generateWAMessageContent(
      { video: { url: tempPath }, ptv: true },
      { upload: conn.waUploadToServer }
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
