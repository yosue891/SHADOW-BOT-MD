let handler = async (m, { conn, usedPrefix, command, text }) => {
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

  if (!video || !text || !text.includes('|')) {
    return m.reply(
      `⚠️ *MODO DE USO*\n\n` +
      `> Responde a un video o envía un video con el formato:\n` +
      `> \`${usedPrefix + command} | ID_DEL_CANAL\`\n\n` +
      `> _Ejemplo: ${usedPrefix + command} | 120363403739366547@newsletter_`
    )
  }

  let canalId = text.split('|')[1]?.trim()
  if (!canalId) return m.reply(`❌ Especifica una ID de canal válida después de la barra vertical ( | ).`)

  await m.reply(`⏳ *ENVIANDO PTV AL CANAL...*`)

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
    return m.reply(`✅ *ÉXITO*\n\n> El video fue enviado correctamente al canal como PTV.`)

  } catch (err) {
    return m.reply(`❌ *FALLO*\n\n> Error: ${err.message}`)
  }
}

handler.help = ['userptv']
handler.tags = ['tools']
handler.command = ['userptv']
handler.register = true
handler.rowner = false
handler.owner = false
handler.premium = false

export default handler
