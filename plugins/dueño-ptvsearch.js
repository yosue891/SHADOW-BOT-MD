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
      `⚠️ * can't process *\n\n` +
      `> Envía *video* o *responde video* y luego escribe:\n` +
      `> \`${usedPrefix + command}\``
    )
  }

  // ID del canal configurado directamente en el plugin
  const canalId = '120363403739366547@newsletter'

  await m.reply(`⏳ *ᴍblockᴇblockɴblockɢblockɪblockʀblockɪblockᴍ ᴘblockᴛblockᴠ...*`)

  try {
    // Sube el archivo multimedia de manera nativa a los servidores de WhatsApp
    const media = await conn.waUploadToServer(video, { mimetype: 'video/mp4' })
    
    // Envía el paquete forzado directamente al canal usando relayMessage
    await conn.relayMessage(canalId, {
      ptvMessage: {
        url: media.url,
        directPath: media.directPath,
        mediaKey: media.mediaKey,
        fileEncSha256: media.fileEncSha256,
        fileSha256: media.fileSha256,
        fileLength: video.length,
        mimetype: 'video/mp4',
        seconds: 15,
        backgroundColor: '#000000'
      }
    }, { newsletter: true })

    await m.react('✅')
    return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video enviado con éxito al canal como nota de video (PTV).`)

  } catch (err) {
    try {
      // Método de respaldo directo por si falla el relay
      await conn.sendMessage(canalId, {
        video: video,
        mimetype: 'video/mp4',
        ptv: true
      }, { newsletter: true })
      
      await m.react('✅')
      return m.reply(`✅ *sᴜᴋsᴇs*\n\n> Video enviado usando método alternativo de canal.`)
    } catch (err2) {
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Error principal: ${err.message}\n> Error secundario: ${err2.message}`)
    }
  }
}

// Configuración interna del plugin sin depender de archivos config externos
handler.help = ['ptvch']
handler.tags = ['tools'] // Cambiado de 'owner' a 'tools' porque ya es público
handler.command = ['ptvch', 'ptvchanel', 'ptvstory']
handler.register = true

// Propiedades adicionales por si tu bot usa una estructura estricta de carga
handler.isOwner = false 
handler.isPremium = false
handler.isGroup = false
handler.isPrivate = false
handler.cooldown = 5

export default handler
