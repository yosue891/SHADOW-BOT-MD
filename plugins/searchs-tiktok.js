import axios from 'axios'

const {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent
} = (await import('@whiskeysockets/baileys')).default

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda o un enlace de TikTok.', m)
  }

  const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text)

  async function createVideoMessage(url) {
    const { videoMessage } = await generateWAMessageContent(
      { video: { url } },
      { upload: conn.waUploadToServer }
    )
    return videoMessage
  }

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

      const caption = `✐ Título » ${title || 'Contenido TikTok'}
ⴵ Autor » ${author?.nickname || author?.unique_id || 'No disponible'}
✰ Duración » ${duration ?? 'No disponible'} segundos
❒ Fecha » ${created_at ?? 'No disponible'}`

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
            {
              audio: { url: music },
              mimetype: 'audio/mp4',
              fileName: 'tiktok_audio.mp4'
            },
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
            caption
          },
          { quoted: m }
        )
        if (m.react) await m.react('✔️')
        return
      }

      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se encontró video descargable en ese enlace.', m)
    }

    conn.reply(m.chat, '✧ *ENVIANDO SUS RESULTADOS..*', m)

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
    if (results.length < 2) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ Se requieren al menos 2 resultados válidos con contenido.', m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 7)

    const cards = []
    for (const v of topResults) {
      const title = v.title || 'Video TikTok'
      const author = v.author?.nickname || v.author?.unique_id || 'Desconocido'
      const duration = v.duration ?? 'No disponible'

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `✐ ${title}\nⴵ Autor » ${author}\n✰ Duración » ${duration} segundos`
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: 'TikTok Search'
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: title,
          hasMediaAttachment: true,
          videoMessage: await createVideoMessage(v.play)
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: []
        })
      })
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `✧ RESULTADO DE: ${text}`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: 'TikTok Search'
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                hasMediaAttachment: false
              }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                cards
              })
            })
          }
        }
      },
      { quoted: m }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

    if (m.react) await m.react('✔️')
  } catch (e) {
    if (m.react) await m.react('✖️')
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}`,
      m
    )
  }
}

handler.help = ['tiktoks <texto|link>', 'tiktoksearch <texto|link>']
handler.tags = ['buscadores']
handler.command = ['tiktoks', 'tiktoksearch', 'ttss']
handler.group = true
handler.coin = 23

export default handler
