import fetch from 'node-fetch'

const handler = async (m, { args, conn }) => {
  try {
    if (!args[0]) {
      return conn.reply(
        m.chat,
        '「✦」Por favor, proporciona un enlace válido de Facebook.',
        m
      )
    }

    if (m.react) await m.react('🕒')

    const api = `https://yosoyyo-api-ofc.onrender.com/api/facebook?url=${encodeURIComponent(args[0])}&apiKey=yosoyyo_sk_2nbk5m69`
    const res = await fetch(api)
    const json = await res.json()

    // Estructura real de tu API
    const data = json.result || json.data || json

    const info = data.info || {}
    const author = data.author || {}
    const media = data.media || {}

    // Aquí están los campos reales
    const videoUrl = media.video_hd || media.video_sd

    if (!videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el enlace de descarga del video. El servidor no devolvió ningún video.',
        m
      )
    }

    const titulo = info.title || 'Video de Facebook'
    const duracion = info.duration ? `\n⏱️ *Duración:* ${info.duration}` : ''
    const autorTxt = author.username ? `\n👤 *Autor:* ${author.username}` : ''

    let txt = `*✦ Descarga de Facebook ✦*\n\n`
    txt += `📝 *Título:* ${titulo}${duracion}${autorTxt}\n\n`
    txt += `> ✩ Aquí tienes tu pedido.`

    await conn.sendFile(
      m.chat,
      videoUrl,
      'facebook.mp4',
      txt,
      m
    )

    if (m.react) await m.react('✔️')

  } catch (error) {
    console.log('Facebook API Error:', error.message)
    if (m.react) await m.react('✖️')
    await m.reply(`Error: ${error.message}`)
  }
}

handler.command = ['facebook', 'fb']
handler.tags = ['descargas']
handler.help = ['facebook', 'fb']

export default handler
