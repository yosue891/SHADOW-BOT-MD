let handler = async (m, { conn, usedPrefix, command }) => {
  let video = null

  if (m.quoted && m.quoted.isVideo) {
    try {
      video = await m.quoted.download()
    } catch (e) {
      return conn.reply(m.chat, `❌ Fallo descarga video de quoted.`, m)
    }
  } else if (m.isVideo) {
    try {
      video = await m.download()
    } catch (e) {
      return conn.reply(m.chat, `❌ Fallo descarga video.`, m)
    }
  }

  if (!video) {
    return conn.reply(
      m.chat,
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
      `> Envía *video* o *responde video* lalu escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  const canalId = '120363403739366547@newsletter'

  await conn.reply(m.chat, `⏳ *ᴍblockᴇɴɢblockɪblockʀblockɪᴍ ᴘblockᴛᴠ ᴋblockᴇ ᴄʜblockᴀɴɴblockᴇʟ...*`, m)

  try {
    await conn.sendMessage(canalId, {
      video: video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      ptv: true
    })

    await m.react('✅')
    return conn.reply(m.chat, `✅ *sᴜᴋsᴇs*\n\n> Video éxito dikirim ke channel sebagai PTV.`, m)

  } catch (err) {
    return conn.reply(m.chat, `❌ *ɢblockᴀɢblockᴀʟ*\n\n> ${err.message}`, m)
  }
}

handler.help = ['ptvch']
handler.tags = ['owner']
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.owner = true

export default handler
