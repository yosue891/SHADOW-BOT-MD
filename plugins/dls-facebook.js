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

    let videoUrl = json.resultado?.video_hd || json.resultado?.video_sd || json.resultado?.url

    if (!videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace. Verifica que el video sea público.',
        m
      )
    }

    await conn.sendFile(
      m.chat,
      videoUrl,
      'facebook.mp4',
      '> ✩ Aqui tienes tu pedido.',
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
