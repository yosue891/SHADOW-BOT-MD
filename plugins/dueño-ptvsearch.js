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

  try {
    await conn.sendMessage(canalId, {
      video: video,
      mimetype: 'video/mp4',
      ptv: true
    }, { 
      quoted: null,
      backgroundColor: '#000000',
      mediaUploadPage: true
    })

    await m.react('✅')
    return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video éxito dikirim ke channel sebagai PTV.`)

  } catch (err) {
    return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Error: ${err.message}`)
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
