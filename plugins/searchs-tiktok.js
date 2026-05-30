import axios from 'axios'

const {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent
} = (await import('@whiskeysockets/baileys')).default

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda de TikTok.', m)
  }

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

    conn.reply(m.chat, '✧ *ENVIANDO SUS RESULTADOS..*', m)

    const res = await axios.get(
      `https://yosoyyo-api-ofc.onrender.com/api/tiktoksearch?q=${encodeURIComponent(text)}&apiKey=yosoyyo_sk_2nbk5m69`
    )

    let results = res.data?.result || []
    results = results.filter(v => v.play)

    if (results.length < 2) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ Se requieren al menos 2 resultados válidos con contenido.', m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 7)

    const cards = []
    for (const v of topResults) {
      const title = v.title || 'Video TikTok'
      const author = v.author || 'Desconocido'
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

handler.help = ['tiktoksearch <texto>']
handler.tags = ['buscadores']
handler.command = ['tiktoks', 'tiktoksearch', 'ttss']
handler.group = true
handler.coin = 23

export default handler
