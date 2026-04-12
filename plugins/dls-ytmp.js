import yts from "yt-search"
import fetch from "node-fetch"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text) return m.reply(`💫 *Shadow invocando*\n\n🎶 Pronuncia el nombre del video o entrega el enlace de YouTube.`)

  const isDirectAudio = ["ytmp3"].includes(command)
  const isDirectVideo = ["playvid", "ytmp4", "play2"].includes(command)
  const isSearchAction = ["yt", "ytv"].includes(command)

  try {
    if (isDirectAudio || isDirectVideo) {
      await m.react("🕘")
      let url = text.trim()
      let title = "Video"
      let thumb = ""

      if (!url.startsWith("https://")) {
        const res = await yts(text)
        if (!res?.videos?.length) return m.reply("❌ Nada fue encontrado…")
        url = res.videos[0].url
        title = res.videos[0].title
        thumb = res.videos[0].thumbnail
      }

      await downloadMedia(conn, m, url, title, thumb, isDirectAudio ? "mp3" : "mp4")
      return
    }

    if (isSearchAction) {
      await m.react("🕘")
      const results = await yts(text)
      const videos = results.videos.slice(0, 6)
      if (!videos.length) return m.reply("❌ No se encontraron resultados.")

      let cards = []
      for (let video of videos) {
        const imageBuffer = (await fetch(video.thumbnail).then(res => res.buffer()))
        const { imageMessage } = await generateWAMessageContent({ image: imageBuffer }, { upload: conn.waUploadToServer })

        cards.push({
          body: proto.Message.InteractiveMessage.Body.fromObject({ 
            text: `✨ *Título:* ${video.title}\n🔔 *Canal:* ${video.author.name}\n🎬 *Duración:* ${video.timestamp}\n👁️ *Vistas:* ${video.views.toLocaleString()}` 
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "Shadow Garden — YouTube" }),
          header: proto.Message.InteractiveMessage.Header.fromObject({ 
            title: "Resultados de Búsqueda", 
            hasMediaAttachment: true, 
            imageMessage 
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: "🎵 Audio",
                  id: `${usedPrefix}ytmp3 ${video.url}`
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: "🎥 Video",
                  id: `${usedPrefix}ytmp4 ${video.url}`
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 Ver en YouTube",
                  url: video.url
                })
              }
            ]
          })
        })
      }

      const messageContent = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({ text: `🌑✦ Resultados para: *${text}*` }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: "Selecciona una opción del carrusel" }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
            })
          }
        }
      }, { quoted: m })

      await conn.relayMessage(m.chat, messageContent.message, { messageId: messageContent.key.id })
      await m.react("✅")
    }

  } catch (error) {
    await m.reply(`❌ *Shadow — Error*\n\n${error.message}`)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, title, thumbnail, type) => {
  try {
    const cleanTitle = cleanName(title) + (type === "mp3" ? ".mp3" : ".mp4")
    const msg = `🎶 *Shadow — Descarga en curso*\n\n✨ *Título:* ${title}\n🌌 Preparando tu ${type === "mp3" ? "audio..." : "video..."}`
    
    let sent = await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

    const apiUrl = type === "mp3"
      ? `https://apiaxi.i11.eu/down/ytaudio?url=${encodeURIComponent(url)}`
      : `https://apiaxi.i11.eu/down/ytvideo?url=${encodeURIComponent(url)}`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data?.status || !data?.resultado?.url_dl) throw new Error("La API no devolvió un archivo válido.")

    const fileUrl = data.resultado.url_dl
    const fileTitle = data.resultado.titulo || title

    if (type === "mp3") {
      await conn.sendMessage(m.chat, {
        audio: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: cleanTitle,
        contextInfo: {
          externalAdReply: {
            title: fileTitle,
            body: "Shadow Ultra 💚",
            thumbnailUrl: thumbnail,
            mediaType: 2,
            mediaUrl: url,
            sourceUrl: url,
            showAdAttribution: true
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: fileUrl },
        mimetype: "video/mp4",
        fileName: cleanTitle
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      text: `🎶 *Shadow — Operación completada*\n\n✨ *Título:* ${fileTitle}\n🌌 Entregada completa uwu.`,
      edit: sent.key
    })
    await m.react("✅")

  } catch (error) {
    await m.reply(`❌ *Shadow — Falla*\n\n${error.message}`)
    await m.react("❌")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

handler.command = ["ytmp3", "playvid", "ytv", "ytmp4", "play2", "yt"]
handler.tags = ["descargas"]
handler.register = true

export default handler
