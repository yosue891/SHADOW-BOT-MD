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
      `⚠️ *MODO DE USO MULTIFUNCIONAL*\n\n` +
      `> Responde o envía un video con el formato:\n` +
      `> \`${usedPrefix + command} | DESTINO\`\n\n` +
      `*Ejemplos de destinos válidos:*\n` +
      `> 📱 *Privado:* \`58412xxxxxxx\`\n` +
      `> 📢 *Link Canal:* \`https://whatsapp.com/channel/xxxxxx\`\n` +
      `> 👥 *Link Grupo:* \`https://chat.whatsapp.com/xxxxxx\`\n` +
      `> 🆔 *ID Directa:* \`120363xxx@newsletter\` o \`120363xxx@g.us\``
    )
  }

  let target = text.split('|')[1]?.trim()
  if (!target) return m.reply(`❌ Especifica un destino válido después de la barra vertical ( | ).`)

  let chatId = target

  if (target.includes('whatsapp.com/channel/')) {
    let code = target.split('channel/')[1]?.split('/')[0]?.trim()
    if (!code) return m.reply(`❌ Enlace de canal inválido o mal estructurado.`)
    try {
      let res = await conn.newsletterMetadata('invite', code)
      if (res?.id) chatId = res.id
    } catch (e) {
      return m.reply(`❌ No se pudo resolver el enlace del canal.\n> Detalles: ${e.message}`)
    }
  } 
  else if (target.includes('chat.whatsapp.com/')) {
    let code = target.split('chat.whatsapp.com/')[1]?.trim()
    if (!code) return m.reply(`❌ Enlace de grupo inválido.`)
    try {
      chatId = await conn.groupGetInviteInfo(code)
    } catch (e) {
      try {
        chatId = await conn.groupAcceptInvite(code)
      } catch (err) {
        return m.reply(`❌ No se pudo obtener la ID del grupo. Asegúrate de que el enlace sea válido.\n> Detalles: ${err.message}`)
      }
    }
  } 
  else if (/^\d+$/.test(target.replace(/[-+()\s]/g, ''))) {
    let cleanNumber = target.replace(/[-+()\s]/g, '')
    chatId = `${cleanNumber}@s.whatsapp.net`
  }

  if (!chatId.includes('@')) {
    if (chatId.endsWith('g.us')) chatId = `${chatId}@g.us`
    else if (chatId.endsWith('newsletter')) chatId = `${chatId}@newsletter`
    else chatId = `${chatId}@s.whatsapp.net`
  }

  await m.reply(`⏳ *ENVIANDO PTV AL DESTINO...*`)

  try {
    await conn.sendMessage(chatId, {
      video: video,
      mimetype: 'video/mp4',
      ptv: true
    }, { 
      quoted: null,
      backgroundColor: '#000000',
      mediaUploadPage: true
    })

    await m.react('✅')
    return m.reply(`✅ *ÉXITO*\n\n> El video fue enviado correctamente como PTV al destino indicado.`)

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
