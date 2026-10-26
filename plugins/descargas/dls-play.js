import { searchYouTube } from "../../lib/youtube-search.js"
import { downloadYouTube } from "../../lib/apiowo.js"
import sharp from "sharp"

function cleanName(name) {
  const cleaned = String(name || "audio").replace(/[^\w\s._-]/gi, "").trim()
  return (cleaned || "audio").substring(0, 70)
}

function formatViews(n) {
  if (!n) return "0"
  const num = Number(n)
  if (isNaN(num)) return String(n)
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B"
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M"
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K"
  return num.toString()
}

function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)
}

function extractVideoId(url) {
  const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i)
  return match?.[1] || null
}

function parsePlayInput(text, fullText, command, usedPrefix) {
  let raw = (text || "").trim()
  if (!raw) {
    const prefixRegex = new RegExp(`^${usedPrefix || "\\."}${command}\\s*`, "i")
    raw = fullText.replace(prefixRegex, "").trim()
  }

  let isVideo = command === "play2" || command === "playvideo"

  const prefixMatch = raw.match(/^(mp3|audio|mp4|video)\s*(.*)$/i)
  if (prefixMatch) {
    const type = prefixMatch[1].toLowerCase()
    if (type === "mp4" || type === "video") isVideo = true
    if (type === "mp3" || type === "audio") isVideo = false
    raw = (prefixMatch[2] || "").trim()
  }

  return {
    query: raw,
    format: isVideo ? "video" : "audio"
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    const fullText = (m.text || "").trim()
    const { query, format } = parsePlayInput(text, fullText, command, usedPrefix)

    if (!query) {
      return m.reply(
        `🎃🦇 *ᴘʟᴀʏ — SHADOW GARDEN • HALLOWEEN* 🦇🎃\n\n` +
        `> Ingresa el título de una canción o un enlace de YouTube para descargar.\n\n` +
        `*Ejemplos de invocación:*\n` +
        `• *${usedPrefix}play* Ghostbusters _(descarga audio MP3)_\n` +
        `• *${usedPrefix}play2* Ghostbusters _(descarga video MP4)_\n` +
        `• *${usedPrefix}play* https://youtu.be/xxxx\n` +
        `• *${usedPrefix}play mp4* https://youtu.be/xxxx\n\n` +
        `⚡ _Descargas directas impulsadas por:_ \`apiowo.vercel.app\` 🚀`
      )
    }

    try { await m.react(format === "video" ? "🎬" : "🎵") } catch {}

    let video = null
    const isDirectLink = isYouTubeUrl(query)

    if (isDirectLink) {
      const videoId = extractVideoId(query)
      const searchRes = await searchYouTube(query)
      if (searchRes?.videos?.length) {
        video = searchRes.videos[0]
      } else {
        video = {
          id: videoId || "video",
          videoId: videoId || "video",
          title: `YouTube ${format === "video" ? "Video" : "Audio"}`,
          author: { name: "YouTube" },
          timestamp: "Desconocida",
          views: "0",
          ago: "",
          url: query,
          thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
        }
      }
    } else {
      const searchRes = await searchYouTube(query)
      if (searchRes?.videos?.length) {
        video = searchRes.videos[0]
      }
    }

    if (!video || !video.url) {
      try { await m.react("❌") } catch {}
      return m.reply(
        `❌ No se encontró ningún video para: *${query}*\n\n` +
        `> Verifica el título o intenta enviando el enlace directo de YouTube.`
      )
    }

    const title = video.title || "Desconocido"
    const authorName = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const views = formatViews(video.views)
    const ago = video.ago || ""
    const url = video.url
    const thumbnailUrl = video.thumbnail

    let info = `🎃 *SHADOW GARDEN • ${format === "video" ? "VIDEO" : "AUDIO"}* 🦇\n\n`
    info += `📌 *Título:* ${title}\n`
    info += `👤 *Canal:* ${authorName}\n`
    info += `⏱️ *Duración:* ${duration}\n`
    info += `👀 *Vistas:* ${views}\n`
    if (ago) info += `📅 *Subido:* ${ago}\n`
    info += `🔗 *Enlace:* ${url}\n\n`
    info += `⏳ _Descargando ${format === "video" ? "video (MP4)" : "audio (MP3)"} con APIOWO, espera un momento..._`

    let jpegThumbnail = null
    if (thumbnailUrl) {
      try {
        const thumbRes = await fetch(thumbnailUrl)
        if (thumbRes.ok) {
          const arr = await thumbRes.arrayBuffer()
          jpegThumbnail = await sharp(Buffer.from(arr)).resize(300, 170).jpeg().toBuffer().catch(() => Buffer.from(arr))
        }
      } catch (errThumb) {
        console.warn("[PLAY] Error obteniendo miniatura:", errThumb?.message)
      }
    }

    let sentInfo = false
    if (jpegThumbnail) {
      try {
        await conn.sendMessage(
          m.chat,
          {
            image: jpegThumbnail,
            caption: info,
            footer: "🎃 SHADOW GARDEN • HALLOWEEN 🦇"
          },
          { quoted: m }
        )
        sentInfo = true
      } catch (errImg) {
        console.warn("[PLAY] No se pudo enviar imagen preview, pasando a texto:", errImg?.message)
      }
    }

    if (!sentInfo) {
      try {
        await conn.sendMessage(m.chat, { text: info }, { quoted: m })
      } catch {
        await m.reply(info)
      }
    }

    if (format === "video") {
      const dlRes = await downloadYouTube(url, "video")
      const downloadUrl = dlRes.download || dlRes.download_url || dlRes.url
      const fileTitle = cleanName(dlRes.title || title)

      let videoBuffer = null
      try {
        const r = await fetch(downloadUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(12000)
        })
        if (r.ok) {
          const arr = await r.arrayBuffer()
          if (arr.byteLength < 50 * 1024 * 1024) {
            videoBuffer = Buffer.from(arr)
          }
        }
      } catch (errBuf) {
        console.warn("[PLAY VIDEO] Precarga de buffer omitida, usando URL:", errBuf?.message)
      }

      await conn.sendMessage(
        m.chat,
        {
          video: videoBuffer || { url: downloadUrl },
          mimetype: "video/mp4",
          fileName: `${fileTitle}.mp4`
        },
        { quoted: m }
      )
    } else {
      const dlRes = await downloadYouTube(url, "audio")
      const downloadUrl = dlRes.download || dlRes.download_url || dlRes.url
      const fileTitle = cleanName(dlRes.title || title)

      let audioBuffer = null
      try {
        const r = await fetch(downloadUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000)
        })
        if (r.ok) {
          const arr = await r.arrayBuffer()
          audioBuffer = Buffer.from(arr)
        }
      } catch (errBuf) {
        console.warn("[PLAY AUDIO] Precarga de buffer omitida, usando URL:", errBuf?.message)
      }

      await conn.sendMessage(
        m.chat,
        {
          audio: audioBuffer || { url: downloadUrl },
          mimetype: "audio/mpeg",
          fileName: `${fileTitle}.mp3`,
          ptt: false
        },
        { quoted: m }
      )
    }

    try { await m.react("✅") } catch {}
  } catch (e) {
    console.error("[PLAY error]", e)
    const errDetail = e?.message || String(e)
    try {
      await m.reply(`❌ Error en play: ${errDetail}`)
    } catch {
      await conn.sendMessage(m.chat, { text: `❌ Error en play: ${errDetail}` })
    }
    try { await m.react("❌") } catch {}
  }
}

handler.help = ["play <cancion>", "play2 <cancion>"]
handler.tags = ["descargas"]
handler.command = ["play", "play2", "playaudio", "playvideo", "ytaudio"]
handler.register = false

export default handler
