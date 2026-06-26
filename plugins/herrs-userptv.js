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
      `> \`${usedPrefix + command} | ID_O_LINK_DEL_CANAL\`\n\n` +
      `> _Ejemplo 1: ${usedPrefix + command} | 120363403739366547@newsletter_\n` +
      `> _Ejemplo 2: ${usedPrefix + command} | https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O_`
    )
  }

  let target = text.split('|')[1]?.trim()
  if (!target) return m.reply(`❌ Especifica una ID o enlace de canal válido después de la barra vertical ( | ).`)

  let canalId = target

  if (target.includes('whatsapp.com/channel/')) {
    let code = target.split('channel/')[1]?.split('/')[0]?.trim()
    if (!code) return m.reply(`❌ Enlace de canal inválido o mal estructurado.`)
    
    try {
      let res = await conn.newsletterMetadata('invite', code)
      if (res?.id) canalId = res.id
    } catch (e) {
      return m.reply(`❌ No se pudo resolver el enlace del canal. Asegúrate de que el bot esté dentro o tenga acceso.\n> Detalles: ${e.message}`)
    }
  }

  if (!canalId.endsWith('@newsletter') && !canalId.includes('@')) {
    canalId = `${canalId}@newsletter`
  }

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
