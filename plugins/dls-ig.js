const handler = async (m, { args, conn, usedPrefix }) => {
  try {

    if (!args[0]) {
      return conn.reply(
        m.chat,
        '「✦」Por favor, proporciona un enlace válido de Instagram.',
        m
      )
    }

    if (m.react) await m.react('🕒')

    const api = `https://apiyosoyyo-ofc.onrender.com/api/instagram?url=${encodeURIComponent(args[0])}&apiKey=shadow_sk_67jp1six`
    const res = await fetch(api)
    const json = await res.json()

    if (json?.status !== 200 || !json?.result?.data) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      )
    }

    const info = json.result.data
    const mediaList = Array.isArray(info.mediaUrls) && info.mediaUrls.length
      ? info.mediaUrls
      : (info.downloadUrl ? [{ url: info.downloadUrl, type: 'video' }] : [])

    if (!mediaList.length) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      )
    }

    const caption = info.title ? `> ✩ ${info.title}` : '> ✩ Aqui tienes tu pedido.'

    for (let media of mediaList) {
      if (media.type === 'image') {
        await conn.sendMessage(m.chat, {
          image: { url: media.url },
          caption
        }, { quoted: m })
      } else {
        await conn.sendFile(
          m.chat,
          media.url,
          'instagram.mp4',
          caption,
          m
        )
      }
    }

    if (m.react) await m.react('✔️')

  } catch (error) {
    if (m.react) await m.react('✖️')
    await m.reply(`Error: ${error.message}`)
  }
}

handler.command = ['instagram', 'ig']
handler.tags = ['descargas']
handler.help = ['instagram', 'ig']

export default handler
