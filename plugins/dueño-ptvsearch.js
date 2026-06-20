let handler = async (m, { conn, usedPrefix, command }) => {
  const owners = global.owner ? global.owner.map(v => v[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : []
  if (!owners.includes(m.sender)) {
    return m.reply(`❌ Este comando está reservado únicamente para los dueños del bot.`)
  }

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

  await m.reply(`⏳ *ᴍblockᴇɴɢblockɪblockʀblockɪᴍ ᴘblockᴛᴠ ᴋblockᴇ ᴄʜblockᴀɴɴblockᴇʟ...*`)

  try {
    await conn.sendMessage(canalId, {
      video: video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      ptv: true
    })

    await m.react('✅')
    return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video éxito dikirim ke channel sebagai PTV.`)

  } catch (err) {
    return m.reply(`❌ *ɢblockᴀɢblockᴀʟ*\n\n> ${err.message}`)
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true

export default handler
