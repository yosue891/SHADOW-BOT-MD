import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply("Escribe el nombre del video o un enlace de YouTube.")

  await m.react("❄️")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "Desconocidas"
    let thumbnail = ""

    if (!text.startsWith("https://")) {
      const res = await yts(text)
      if (!res?.videos?.length) return m.reply("No encontré nada.")
      const video = res.videos[0]
      title = video.title
      authorName = video.author?.name
      durationTimestamp = video.timestamp
      views = video.views
      url = video.url
      thumbnail = video.thumbnail
    }

    const vistas = formatViews(views)

    const res3 = await fetch("https://files.catbox.moe/wfd0ze.jpg")
    const thumb3 = Buffer.from(await res3.arrayBuffer())

    const fkontak = {
      key: { fromMe: false, participant: "0@s.whatsapp.net" },
      message: {
        documentMessage: {
          title: `「 ${title} 」`,
          fileName: global.botname || "Bot",
          jpegThumbnail: thumb3
        }
      }
    }

    const caption = `❄️ *Título:* ☃️ ${title}
> ▶️ *Canal:* ${authorName}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 💫 *Vistas:* ${vistas}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> ⏳ *Duración:* ${durationTimestamp}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 🌐 *Link:* ${url}
𖹭.╭╭ִ╼࣪━ִﮩ٨ـﮩ♡̫shadow bot♡ִ̫ﮩ٨ـﮩ━ִ╾࣪╮╮.𖹭*
> .𖹭 © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʏᴏsᴜᴇ𖹭.`

    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(m.chat, { image: thumb, caption }, { quoted: fkontak })

    await m.react("🎧")

    const audio = await getAudio(url)
    if (!audio?.status) throw `Error al obtener el audio: ${audio?.error || "Desconocido"}`

    const audioBuffer = await fetchBuffer(audio.result.download)

    await conn.sendMessage(
      m.chat,
      {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      },
      { quoted: fkontak }
    )

    await m.react("✅")
  } catch (e) {
    console.error(e)
    m.reply("Error: " + e.message)
    m.react("⚠️")
  }
}

const fetchBuffer = async (url) => {
  const response = await fetch(url)
  return await response.buffer()
}

const getAudio = async (url) => {
  try {
    const endpoint = `https://api-adonix.ultraplus.click/download/ytaudio?apikey=shadow.xyz&url=${encodeURIComponent(url)}`
    const r = await fetch(endpoint)
    const json = await r.json()

    if (!json?.status || !json?.data?.url)
      return { status: false, error: "No se pudo obtener audio" }

    return {
      status: true,
      result: {
        download: json.data.url,
        title: json.data.title || "audio"
      }
    }
  } catch (e) {
    return { status: false, error: e.message }
  }
}

const formatViews = (views) => {
  if (views === undefined || views === null) return "No disponible"
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B`
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return views.toString()
}

handler.command = ["play"]
handler.tags = ["descargas"]
handler.register = true

export default handler
