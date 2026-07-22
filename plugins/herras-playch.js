import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`[ 🕸️ ] Formato incorrecto. Revela el portal usando:\n${usedPrefix + command} id_del_canal | nombre o enlace de la música`)

  const parts = text.split('|')
  if (parts.length < 2) return m.reply(`[ ⚠️ ] Separa el destino de la invocación usando la barra '|'. Ej:\n${usedPrefix + command} 120363300000000000@newsletter | Eminence in Shadow Theme`)

  const channelId = parts[0].trim()
  const searchQuery = parts.slice(1).join('|').trim()

  if (!channelId || !searchQuery) return m.reply(`[ 🕳️ ] El ID del canal o el rastro de la música se ha perdido en el vacío. Asegúrate de estructurar bien el comando.`)

  await m.react("🔥")

  try {
    let url = searchQuery
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = 0
    let thumbnail = ""

    const isUrl = /^https?:\/\/\S+/i.test(url)

    if (isUrl) {
      if (!isYouTubeUrl(url)) {
        if (m.react) await m.react("❌")
        return m.reply("[ ⚠️ ] Ese enlace no pertenece al reino de YouTube. No intentes engañar a la sombra.")
      }

      const videoId = extractVideoId(url)
      if (!videoId) {
        return m.reply("[ 🕳️ ] No pude extraer la esencia de este video.")
      }

      const res = await yts({ videoId })
      if (!res) {
        return m.reply("[ 🕳️ ] La sombra no pudo obtener información de este archivo cósmico.")
      }

      title = res.title || title
      authorName = res.author?.name || authorName
      durationTimestamp = res.timestamp || durationTimestamp
      views = res.views || views
      thumbnail = res.thumbnail || thumbnail
      url = res.url || url
    } else {
      const res = await yts(url)
      if (!res?.videos?.length) {
        if (m.react) await m.react("❌")
        return m.reply("[ 🕳️ ] La sombra buscó en los confines de la red y no encontró nada.")
      }

      const video = res.videos[0]
      title = video.title || title
      authorName = video.author?.name || authorName
      durationTimestamp = video.timestamp || durationTimestamp
      views = video.views || views
      url = video.url || url
      thumbnail = video.thumbnail || thumbnail
    }

    const vistas = formatViews(views)

    const fallbackThumbRes = await fetch("https://files.catbox.moe/dsgmid.jpg")
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

✧━───『 𝑺𝒉𝒂𝒅𝒐𝒘 𝑩𝒐𝒕 』───━✧
⚡ 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 𝒀𝒐𝒔𝒖𝒆 & 𝑺𝒉𝒂𝒅𝒐𝒘 𝑮𝒂𝒓𝒅𝒆𝒏 ⚡
`.trim()

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

    await downloadMediaToChannel(conn, m, url, channelId, fkontak)
    await m.react("⚔️")
  } catch (e) {
    console.error(e)
    await m.reply("[ 🩸 ] Las sombras detectaron una anomalía en el sistema: " + e.message)
    await m.react("⚠️")
  }
}

const downloadMediaToChannel = async (conn, m, url, channelId, quotedMsg) => {
  try {
    const sent = await conn.sendMessage(
      m.chat,
      { text: "[ ⏳ ] Invocando el arte prohibido... Transfiriendo el audio al canal de destino..." },
      { quoted: m }
    )

    const apiUrl = `https://api-gohan-v1.onrender.com/download/ytaudio?url=${encodeURIComponent(url)}`
    const r = await fetch(apiUrl)

    if (!r.ok) {
      return m.reply(`[ 🩸 ] El nexo de la API ha fallado al canalizar la descarga.`)
    }

    const data = await r.json()

    if (!data?.status || !data?.result?.download_url) {
      return m.reply("[ 🕳️ ] La transferencia ha sido corrompida. El audio no existe.")
    }

    const fileUrl = data.result.download_url
    const fileTitle = cleanName(data.result.title || "audio")

    await conn.sendMessage(
      channelId,
      {
        audio: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: `${fileTitle}.mp3`,
        ptt: false
      }
    )

    try {
      await conn.sendMessage(
        m.chat,
        {
          text: `⚔️ Transferencia dimensional completada.\n\n🎼 Título: ${fileTitle}\n👁️ Destino: Canal de las Sombras`,
          edit: sent.key
        }
      )
    } catch {
      await m.reply(`⚔️ Transferencia dimensional completada.\n\n🎼 Título: ${fileTitle}`)
    }
  } catch (e) {
    console.error(e)
    await m.reply("[ 🩸 ] Las sombras fallaron al desviar el flujo al canal. Asegúrate de que la ID sea correcta (ej: 120363xxxxxxxx@newsletter) y que el bot sea administrador: " + e.message)
    await m.react("⚠️")
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

handler.command = ["playch"]
handler.tags = ["descargas"]
handler.help = ['playch']
handler.register = false

export default handler
