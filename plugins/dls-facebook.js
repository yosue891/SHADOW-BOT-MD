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

    console.log('Respuesta completa de la API:', JSON.stringify(json, null, 2))

    const resultado = json.resultado || json.result || json
    let videoUrl = resultado?.video_hd || resultado?.video_sd || resultado?.url || resultado?.urls?.[0]?.url

    if (!videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace. Verifica que el video sea público.',
        m
      )
    }

    let titulo = resultado?.titulo || resultado?.title || resultado?.descripcion || resultado?.description || 'Video de Facebook'
    let duracion = resultado?.duracion || resultado?.duration ? `\n⏱️ *Duración:* ${resultado.duracion || resultado.duration}` : ''

    let txt = `*✦ Descarga de Facebook ✦*\n\n`
    txt += `📝 *Título:* ${titulo}${duracion}\n\n`
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
