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

  await m.reply(`⏳ *ᴍᴇɴɢɪʀɪᴍ ᴘᴛᴠ ᴋᴇ ᴄʜᴀɴɴᴇʟ...*`)

  try {
    await conn.sendMessage(canalId, {
      video: video,
      mimetype: 'video/mp4',
      backgroundColor: '#001a33',
      seconds: 15,
      ptv: true
    }, { 
      mediaUploadPage: true,
      backgroundColor: '#001a33'
    })

    await m.react('✅')
    return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video éxito dikirim ke channel sebagai PTV.`)

  } catch (err) {
    try {
      await conn.query({
        tag: 'message',
        attrs: { to: canalId, type: 'text' },
        content: [
          {
            tag: 'video',
            attrs: { ptv: 'true', mimetype: 'video/mp4' },
            content: video
          }
        ]
      })
      
      await m.react('✅')
      return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video enviado mediante query nativo de Baileys.`)
    } catch (err2) {
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Error 1: ${err.message}\n> Error 2: ${err2.message}`)
    }
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true

export default handler
