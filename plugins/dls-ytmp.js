import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`💫 *Shadow invocando*

🎶 Pronuncia el nombre del video o entrega el enlace de YouTube.`)

  await m.react("🕘")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "Desconocidas"
    let thumbnail = ""

    if (!text.startsWith("https://")) {
      const res = await yts(text)
      if (!res?.videos?.length) {
        return m.reply(`🔍 *Shadow buscando*

❌ Nada fue encontrado…`)
      }

      const video = res.videos[0]
      title = video.title
      authorName = video.author?.name
      durationTimestamp = video.timestamp
      views = video.views
      url = video.url
      thumbnail = video.thumbnail
    }

    const isAudio = ["ytmp3"].includes(command)
    const isVideo = ["playvid", "ytv", "ytmp4", "play2"].includes(command)

    if (isAudio) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp3")
    } else if (isVideo) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp4")
    } else {
      await m.reply(`🔍 *Shadow — Análisis*

✨ *Título:* ${title}
🔔 *Canal:* ${authorName}
🎬 *Duración:* ${durationTimestamp}
👁️ *Vistas:* ${views}

Comandos disponibles:
• *.ytmp3 ${url}*
• *.ytmp4 ${url}*
• *.play2 ${url}*`)
    }

  } catch (error) {
    await m.reply(`❌ *Shadow — Error en la operación*

❌ ${error.message}`)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, title, thumbnail, type) => {
  try {
    const cleanTitle = cleanName(title) + (type === "mp3" ? ".mp3" : ".mp4")

    const msg = `🎶 *Shadow — Descarga en curso*

✨ *Título:* ${title}
🌌 Preparando tu ${type === "mp3" ? "audio espera un poco..." : "video"}...`

    let sent
    if (thumbnail) {
      sent = await conn.sendMessage(
        m.chat,
        { image: { url: thumbnail }, caption: msg },
        { quoted: m }
      )
    } else {
      sent = await conn.sendMessage(
        m.chat,
        { text: msg },
        { quoted: m }
      )
    }

    const apiUrl = type === "mp3"
      ? `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(url)}&apikey=SHADOWKEYBOTMD`
      : `https://api-adonix.ultraplus.click/download/ytvideo?url=${encodeURIComponent(url)}&apikey=SHADOWKEYBOTMD`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data?.status || !data?.data?.url) {
      throw new Error("La API no devolvió un archivo válido.")
    }

    const fileUrl = data.data.url
    const fileTitle = data.data.title || title

    if (type === "mp3") {
      await conn.sendMessage(
        m.chat,
        {
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
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: fileUrl },
          mimetype: "video/mp4",
          fileName: cleanTitle
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      {
        text: `🎶 *Shadow — Operación completada*

✨ *Título:* ${fileTitle}
🌌 Entregada completa uwu.`,
        edit: sent.key
      }
    )

    await m.react("✅")

  } catch (error) {
    await m.reply(`❌ *Shadow — Falla en la entrega*

❌ ${error.message}`)
    await m.react("❌")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

handler.command = handler.help = ["ytmp3", "playvid", "ytv", "ytmp4", "play2", "yt"]
handler.tags = ["descargas"]
handler.register = true

export default handler            
