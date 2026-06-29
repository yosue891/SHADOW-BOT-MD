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

    const data = json.resultado || json.result || json.data || json
    
    let videoUrl = ''
    if (typeof data === 'string') {
      videoUrl = data
    } else {
      videoUrl = data.video_hd || data.hd || data.video_sd || data.sd || data.url || data.urls?.[0]?.url || data.video || data.link
    }

    if (!videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el enlace de descarga del video. Asegúrate de que el formato sea correcto.',
        m
      )
    }

    let titulo = data.titulo || data.title || data.descripcion || data.description || 'Video de Facebook'
    let duracion = data.duracion || data.duration ? `\n⏱️ *Duración:* ${data.duracion || data.duration}` : ''
    let autor = data.autor || data.author || data.owner ? `\n👤 *Autor:* ${data.autor || data.author || data.owner}` : ''

    let txt = `*✦ Descarga de Facebook ✦*\n\n`
    txt += `📝 *Título:* ${titulo}${duracion}${autor}\n\n`
    txt += `> ✩ Aqui tienes tu pedido.`

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
