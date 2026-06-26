import axios from 'axios'

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
      `> 👥 *Link Grupo/Comunidad:* \`https://chat.whatsapp.com/xxxxxx\`\n` +
      `> 🆔 *ID Directa:* \`120363xxx@newsletter\` o \`120363xxx@g.us\``
    )
  }

  let target = text.split('|')[1]?.trim()
  if (!target) return m.reply(`❌ Especifica un destino válido después de la barra vertical ( | ).`)

  let chatId = target
  let isNewsletter = false

  if (target.includes('whatsapp.com/channel/')) {
    try {
      const htmlRes = await axios.get(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      })
      const match = htmlRes.data.match(/"id":"(\d+@newsletter)"/)
      if (match && match[1]) {
        chatId = match[1]
        isNewsletter = true
      } else {
        throw new Error('No se encontró la ID pública en el código del canal.')
      }
    } catch (e) {
      return m.reply(`❌ No se pudo resolver el enlace del canal.\n> Detalles: ${e.message}`)
    }
  } 
  else if (target.includes('chat.whatsapp.com/')) {
    try {
      let code = target.split('chat.whatsapp.com/')[1]?.split('/')[0]?.trim()
      if (code === 'invite') {
        code = target.split('chat.whatsapp.com/invite/')[1]?.split('/')[0]?.trim()
      }
      
      if (!code) throw new Error('No se pudo extraer el código de invitación del enlace.')

      try {
        let queryGroup = await conn.query({
          tag: 'iq',
          attrs: { type: 'get', xmlns: 'w:g2', to: '@g.us' },
          content: [{ tag: 'invite', attrs: { code } }]
        })
        
        let groupNode = queryGroup?.content?.[0]
        if (groupNode && groupNode.attrs?.id) {
          chatId = `${groupNode.attrs.id}@g.us`
        } else {
          throw new Error('La consulta estructural no devolvió una ID válida para este enlace.')
        }
      } catch {
        const htmlRes = await axios.get(target, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 10000
        })
        const matchId = htmlRes.data.match(/"g\.us.*?id":"(\d+@g\.us)"/) || htmlRes.data.match(/"chat_jid":"(\d+@g\.us)"/)
        if (matchId && matchId[1]) {
          chatId = matchId[1]
        } else {
          throw new Error('El enlace de grupo o comunidad es inválido o el bot no tiene acceso.')
        }
      }
    } catch (e) {
      return m.reply(`❌ No se pudo obtener la ID del destino (Grupo/Comunidad).\n> Detalles: ${e.message}`)
    }
  } 
  else if (/^\d+$/.test(target.replace(/[-+()\s]/g, ''))) {
    let cleanNumber = target.replace(/[-+()\s]/g, '')
    chatId = `${cleanNumber}@s.whatsapp.net`
  }

  if (!chatId.includes('@')) {
    if (chatId.endsWith('g.us')) chatId = `${chatId}@g.us`
    else if (chatId.endsWith('newsletter')) {
      chatId = `${chatId}@newsletter`
      isNewsletter = true
    }
    else chatId = `${chatId}@s.whatsapp.net`
  }

  if (chatId.endsWith('@newsletter')) {
    isNewsletter = true
  }

  await m.reply(`⏳ *ENVIANDO PTV AL DESTINO...*`)

  try {
    await conn.sendMessage(chatId, {
      video: video,
      mimetype: 'video/mp4',
      ptv: true
    }, { 
      quoted: isNewsletter ? null : m,
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
