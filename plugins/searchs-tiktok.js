import axios from 'axios'
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent
} from '@whiskeysockets/baileys'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return m.reply('✐ Ingresa un término de búsqueda de TikTok.')

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
    await m.react('🕘')

    const res = await axios.get(
      `https://yosoyyo-api-ofc.onrender.com/api/tiktoksearch?q=${encodeURIComponent(text)}&apiKey=yosoyyo_sk_2nbk5m69`
    )

    let results = res.data?.result || res.data?.results || res.data?.data || []
    if (!Array.isArray(results) && typeof results === 'object') results = [results]

    const validResults = results.filter(v => v && (v.play || v.download || v.video))
    if (!validResults.length) return m.reply('❌ No se encontraron videos válidos.')

    shuffleArray(validResults)
    const topResults = validResults.slice(0, 7)

    let cards = []
    for (const v of topResults) {
      const videoUrl = v.play || v.download || v.video
      const coverUrl = v.cover || v.origin_cover
      const audioUrl = v.music || v.audio || v.sound || videoUrl
      const title = v.title || v.description || 'Video TikTok'
      const author = v.author?.nickname || v.author || 'Desconocido'
      const duration = v.duration || 'No disponible'

      const imageMessage = await createImageMessage(coverUrl)

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `✨ Título: ${title}\n👤 Autor: ${author}\n⏳ Duración: ${duration}s`
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: 'Shadow Garden — TikTok'
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: 'Resultados TikTok',
          hasMediaAttachment: true,
          imageMessage
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🎵 Audio',
                id: `${usedPrefix}tiktokaudio ${videoUrl}`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🎥 Video',
                id: `${usedPrefix}tiktokvideo ${videoUrl}`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🖼 Imagen',
                id: `${usedPrefix}tiktokimg ${coverUrl}`
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '🌐 Ver en TikTok',
                url: videoUrl
              })
            }
          ]
        })
      })
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `🌑✦ Resultados para: *${text}*`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: 'Selecciona una opción del carrusel'
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
    await m.react('✅')

  } catch (e) {
    await m.reply(`❌ Error\n${e.message}`)
    await m.react('⚠️')
  }
}

handler.help = ['tiktoksearch <texto>']
handler.tags = ['buscadores']
handler.command = ['tiktoks', 'tiktoksearch', 'ttss']
handler.group = true

export default handler
