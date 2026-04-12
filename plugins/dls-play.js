import fetch from "node-fetch"

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply("🎶 Ingresa el nombre o enlace del video de YouTube.")

  await m.react("🕘")

  try {
    let url = text.trim()
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = 0
    let thumbnail = ""

    const isUrl = /^https?:\/\/\S+/i.test(url)

    if (isUrl) {
      if (!isYouTubeUrl(url)) {
        return m.reply("🚫 El enlace no es válido de YouTube.")
      }

      const videoId = extractVideoId(url)
      if (!videoId) {
        return m.reply("🚫 No pude extraer el ID del video.")
      }
    } else {
      return m.reply("🚫 Por favor, ingresa un enlace de YouTube válido.")
    }

    const vistas = formatViews(views)

    const fallbackThumbRes = await fetch("https://i.ibb.co/83pbxQN/5eecaebbc7c3.jpg")
    const fallbackThumb = Buffer.from(await fallbackThumbRes.arrayBuffer())

    const fkontak = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
      },
      message: {
        locationMessage: {
          name: `『 ${title} 』`,
          jpegThumbnail: fallbackThumb
        }
      }
    }

    const caption = `
✧━───『 𝙸𝚗𝚏𝚘 𝚍𝚎𝚕 𝚅𝚒𝚍𝚎𝚘 』───━✧

🎼 𝑻𝒊́𝒕𝒖𝒍𝒐: ${title}
📺 𝑪𝒂𝒏𝒂𝒍: ${authorName}
👁️ 𝑽𝒊𝒔𝒕𝒂𝒔: ${vistas}
⏳ 𝑫𝒖𝒓𝒂𝒄𝒊𝒐́𝒏: ${durationTimestamp}
🌐 𝑬𝒏𝒍𝒂𝒄𝒆: ${url}

✧━───『 𝑺𝒉𝒂𝒅𝒐𝒒 𝑩𝒐𝒕 』───━✧
⚡ 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 𝒀𝒐𝒔𝒖𝒆 ⚡
`

    let thumb = fallbackThumb

    if (thumbnail) {
      try {
        thumb = (await conn.getFile(thumbnail)).data
      } catch {
        thumb = fallbackThumb
      }
    }

    await conn.sendMessage(
      m.chat,
      {
        image: thumb,
        caption
      },
      { quoted: fkontak }
    )

    await downloadMedia(conn, m, url, fkontak)
    await m.react("✅")
  } catch (e) {
    console.error(e)
    await m.reply("❌ Error: " + e.message)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, quotedMsg) => {
  try {
    const sent = await conn.sendMessage(
      m.chat,
      { text: "🎵 Descargando audio..." },
      { quoted: m }
    )

    const apiUrl = `https://api-gohan.onrender.com/download/ytaudio?url=${encodeURIComponent(url)}`
    const r = await fetch(apiUrl)

    if (!r.ok) {
      return m.reply(`🚫 Error HTTP ${r.status} al obtener el audio.`)
    }

    const data = await r.json()
    console.log("Respuesta API:", JSON.stringify(data, null, 2))

    if (!data?.status || !data?.result?.download_url) {
      return m.reply("🚫 No se pudo obtener el audio.")
    }

    const fileUrl = data.result.download_url
    const fileTitle = cleanName(data.result.title || "audio")

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: `${fileTitle}.mp3`,
        ptt: false
      },
      { quoted: quotedMsg }
    )

    try {
      await conn.sendMessage(
        m.chat,
        {
          text: `✅ Descarga completada\n\n🎼 Título: ${fileTitle}`,
          edit: sent.key
        }
      )
    } catch {
      await m.reply(`✅ Descarga completada\n\n🎼 Título: ${fileTitle}`)
    }
  } catch (e) {
    console.error(e)
    await m.reply("❌ Error: " + e.message)
    await m.react("💀")
  }
}

const cleanName = (name) =>
  String(name).replace(/[^\w\s._-]/gi, "").substring(0, 50)

const formatViews = (views) => {
  const n = Number(views)
  if (!n || Number.isNaN(n)) return "No disponible"
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

const isYouTubeUrl = (url) => {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)
}

const extractVideoId = (url) => {
  const match =
    url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&/]|\b)/) ||
    url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/)
  return match?.[1] || null
}

handler.command = ["play", "yt"]
handler.tags = ["descargas"]
handler.register = true

export default handler
