import axios from 'axios'
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent
} from '@whiskeysockets/baileys'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda de TikTok.', m)
  }

  async function createImageMessage(url) {
    const { imageMessage } = await generateWAMessageContent(
      { image: { url } },
      { upload: conn.waUploadToServer }
    )
    return imageMessage
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  try {
    if (m.react) await m.react('🕒')

    conn.reply(m.chat, '✧ ENVIANDO SUS RESULTADOS..', m)

    const res = await axios.get(
      `https://yosoyyo-api-ofc.onrender.com/api/tiktoksearch?q=${encodeURIComponent(text)}&apiKey=yosoyyo_sk_2nbk5m69`
    )

    let results = res.data?.result || res.data?.results || res.data?.data || []
    
    if (!Array.isArray(results) && typeof results === 'object') {
      results = [results]
    }

    const validResults = results.filter(v => v && (v.play || v.download || v.video))

    if (!validResults.length) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se encontraron videos válidos en la respuesta de la API.', m)
    }

    shuffleArray(validResults)
    const topResults = validResults.slice(0, 7)

    const cards = []
    for (const v of topResults) {
      try {
        const videoUrl = v.play || v.download || v.video
        const coverUrl = v.cover || v.origin_cover || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7'
        const imageMessage = await createImageMessage(coverUrl)
        
        const title = v.title || v.description || 'Video TikTok'
        const author = v.author?.nickname || v.author || 'Desconocido'
        const duration = v.duration ?? 'No disponible'

        cards.push({
          body: {
            text: `✐ ${title}\nⴵ Autor » ${author}\n✰ Duración » ${duration} segundos`
          },
          footer: {
            text: 'TikTok Search'
          },
          header: {
            title: title.slice(0, 50),
            hasMediaAttachment: true,
            imageMessage: imageMessage
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Ver / Descargar Video",
                  url: videoUrl,
                  merchant_url: videoUrl
                })
              }
            ]
          }
        })
      } catch (err) {}
    }

    if (!cards.length) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se pudo procesar ninguna card para el carrusel.', m)
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
              body: {
                text: `✧ RESULTADO DE: ${text}`
              },
              footer: {
                text: 'TikTok Search'
              },
              header: {
                hasMediaAttachment: false
              },
              carouselMessage: {
                cards
              }
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
      `⚠︎ Se ha producido un problema.\n\n🜸 Detalles: ${e.message}`,
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
