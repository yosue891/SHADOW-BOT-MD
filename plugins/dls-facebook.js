const handler = async (m, { args, conn, usedPrefix }) => {
  try {

    if (!args[0]) {
      return conn.reply(
        m.chat,
        '「✦」Por favor, proporciona un enlace válido de Facebook.',
        m
      )
    }

    let data = []

    if (m.react) await m.react('🕒')

    try {
      const api = `${global.APIs.delirius.url}/download/facebook?url=${encodeURIComponent(args[0])}`
      const res = await fetch(api)
      const json = await res.json()

      if (Array.isArray(json?.data)) {
        data = json.data.map(v => v.url)
      }

    } catch (e) {
      console.log('Delirius FB error:', e.message)
    }

    if (!data.length) {
      try {
        const api = `${global.APIs.vreden.url}/api/fbdownload?url=${encodeURIComponent(args[0])}`
        const res = await fetch(api)
        const json = await res.json()

        if (Array.isArray(json?.resultado?.respuesta?.datos)) {
          data = json.resultado.respuesta.datos.map(v => v.url)
        }

      } catch (e) {
        console.log('Vreden FB error:', e.message)
      }
    }

    if (!data.length) {
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      )
    }

    for (let media of data) {
      await conn.sendFile(
        m.chat,
        media,
        'facebook.mp4',
        '> ✩ Aqui tienes tu pedido.',
        m
      )

      if (m.react) await m.react('✔️')
    }

  } catch (error) {
    if (m.react) await m.react('✖️')
    await m.reply(`Error: ${error.message}`)
  }
}

handler.command = ['facebook', 'fb']
handler.tags = ['descargas']
handler.help = ['facebook', 'fb']

export default handler