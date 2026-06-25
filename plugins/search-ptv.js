import axios from 'axios'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda o un enlace de TikTok.', m)
  }

  const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text)

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  try {
    if (m.react) await m.react('🕒')

    if (isUrl) {
      const res = await axios.get(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`
      )

      const data = res.data?.data
      if (!data?.play && !data?.images) {
        if (m.react) await m.react('✖️')
        return conn.reply(m.chat, 'ꕥ Enlace inválido o sin contenido descargable.', m)
      }

      const { title, duration, author, created_at, type, images, music, play } = data

      const caption = `✐ Título » ${title || 'Contenido TikTok'}\nⴵ Autor » ${author?.nickname || author?.unique_id || 'No disponible'}\n✰ Duración » ${duration ?? 'No disponible'} segundos\n❒ Fecha » ${created_at ?? 'No disponible'}`

      if (type === 'image' && Array.isArray(images) && images.length) {
        for (let i = 0; i < Math.min(images.length, 10); i++) {
          await conn.sendMessage(
            m.chat,
            { image: { url: images[i] }, caption: i === 0 ? caption : undefined },
            { quoted: m }
          )
        }

        if (music) {
          await conn.sendMessage(
            m.chat,
            { audio: { url: music }, mimetype: 'audio/mp4', fileName: 'tiktok_audio.mp4' },
            { quoted: m }
          )
        }

        if (m.react) await m.react('✔️')
        return
      }

      if (play) {
        await conn.sendMessage(
          m.chat,
          {
            video: { url: play },
            mimetype: 'video/mp4',
            ptv: true
          },
          { quoted: m }
        )
        if (m.react) await m.react('✔️')
        return
      }

      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se encontró video descargable en ese enlace.', m)
    }

    await conn.reply(m.chat, `✧ *ENVIANDO VIDEOS EN FORMATO PTV PARA:* *${text.toUpperCase()}* 🎬`, m)

    const form = new URLSearchParams()
    form.append('keywords', text)
    form.append('count', '20')
    form.append('cursor', '0')
    form.append('HD', '1')

    const res = await axios({
      method: 'POST',
      url: 'https://tikwm.com/api/feed/search',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': 'current_language=en',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
      },
      data: form.toString()
    })

    let results = res.data?.data?.videos?.filter(v => v.play) || []
    if (results.length < 1) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se encontraron resultados válidos.', m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 4)

    for (const v of topResults) {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: v.play },
          mimetype: 'video/mp4',
          ptv: true
        },
        { quoted: m }
      )
    }

    if (m.react) await m.react('🔥')
  } catch (e) {
    if (m.react) await m.react('✖️')
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}`,
      m
    )
  }
}

handler.help = ['ptvsearch <texto|link>']
handler.tags = ['buscadores']
handler.command = ['ptvsearch', 'ptvtt', 'ttptv']
handler.group = true
handler.coin = 23

export default handler
