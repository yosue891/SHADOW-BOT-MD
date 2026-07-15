const pluginConfig = {
  description: 'Envía un video como nota de video circular (PTV).',
  cooldown: 5,
  energi: 1,
  isEnabled: true
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime.startsWith('video/')) {
    return conn.reply(
      m.chat,
      ` *MODO DE USO*\n\n` +
      `> Envía un *video* o *responde a un video* y escribe:\n` +
      `> \`${usedPrefix + command}\``,
      m
    )
  }

  await conn.reply(
    m.chat,
    ' *Convirtiendo el video a PTV...*',
    m
  )

  let video
  try {
    video = await q.download?.()

    if (!video || video.length < 1) {
      throw new Error('No se pudo descargar el video.')
    }
  } catch (e) {
    console.error(e)
    return conn.reply(
      m.chat,
      `Error al descargar el video.\n\n> ${e.message || e}`,
      m
    )
  }

  try {
    // Corrección para evitar el error 'undefined' al enviar el PTV
    await conn.sendMessage(
      m.chat,
      {
        video: video,
        mimetype: 'video/mp4',
        ptv: true
      },
      { quoted: m }
    )

    if (m.react) await m.react('✅')
  } catch (err) {
    console.error(err)
    return conn.reply(
      m.chat,
      `Error al enviar el PTV.\n\n> ${err.message || err}`,
      m
    )
  }
}

handler.help = ['ptv']
handler.tags = ['tools']
handler.command = ['ptv', 'pvideo', 'circlevideo']
handler.register = true

export default handler
