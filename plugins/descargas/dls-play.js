/**
 * SHADOW-BOT-MD — PLAY híbrido
 * Basado en ourinv3/plugins/search/play.js (botones) 
 * + API audio de Shadow-BOT-MD (gohan) + API video de ourin (firefly maiku)
 * 
 * - Búsqueda con yt-search
 * - Muestra botones MP3 / MP4 (ourin style)
 * - Descarga audio con https://api-gohan-v1.onrender.com (Shadow)
 * - Descarga video con https://firefly.maiku.my.id (ourin - OurinNextGen)
 */

import yts from "yt-search"
import axios from "axios"
import fetch from "node-fetch"
import sharp from "sharp"
import { generateWAMessageFromContent } from "@whiskeysockets/baileys"

// ===== APIs =====
const SHADOW_AUDIO_API = "https://api-gohan-v1.onrender.com/download/ytaudio?url="
const OURIN_VIDEO_API = "https://firefly.maiku.my.id/api/ytdown"
const FIREFLY_KEY = "OurinNextGen" // de ourinv3/config.js APIkey.firefly

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

// ===== DESCARGAS =====

// Audio con API de Shadow (gohan)
async function getShadowAudio(url) {
  const apiUrl = `${SHADOW_AUDIO_API}${encodeURIComponent(url)}`
  const r = await fetch(apiUrl)
  if (!r.ok) throw new Error(`HTTP ${r.status} al obtener audio (Shadow API)`)
  const data = await r.json()
  console.log("[PLAY Shadow AUDIO]", JSON.stringify(data, null, 2))
  if (!data?.status || !data?.result?.download_url) {
    throw new Error(data?.message || "Shadow API no devolvió audio válido")
  }
  return {
    download: data.result.download_url,
    title: cleanName(data.result.title || "audio")
  }
}

// Video con API de Ourin (firefly)
async function getOurinVideo(url) {
  const { data } = await axios.get(OURIN_VIDEO_API, {
    params: { apikey: FIREFLY_KEY, url },
    timeout: 60000,
    headers: { "User-Agent": "Mozilla/5.0" }
  })

  if (data?.status && data?.data?.mediaItems) {
    const mediaItems = data.data.mediaItems
    const video =
      mediaItems.find(m => m.type === "Video" && m.mediaQuality === "HD") ||
      mediaItems.find(m => m.type === "Video" && m.mediaQuality === "SD") ||
      mediaItems.find(m => m.type === "Video")

    if (video?.mediaUrl) {
      let attempts = 0
      while (attempts < 12) {
        const { data: fileData } = await axios.get(video.mediaUrl, { timeout: 15000 })
        if (fileData?.status === "completed" && fileData?.fileUrl) {
          return {
            download: fileData.fileUrl,
            title: cleanName(data?.data?.title || fileData?.title || "video")
          }
        }
        await new Promise(res => setTimeout(res, 3000))
        attempts++
      }
      throw new Error("Timeout esperando video (firefly)")
    }
  }

  // Fallback a Shadow si firefly falla (opcional)
  try {
    const fallbackUrl = `https://api-gohan-v1.onrender.com/download/ytvideo?url=${encodeURIComponent(url)}`
    const fr = await fetch(fallbackUrl)
    const fdata = await fr.json()
    if (fdata?.status && fdata?.result?.download_url) {
      return { download: fdata.result.download_url, title: cleanName(fdata.result.title || "video") }
    }
  } catch {}

  throw new Error("No se pudo obtener video con API de Ourin (firefly)")
}

async function sendAudioDownload(conn, m, url) {
  const { download, title } = await getShadowAudio(url)
  await conn.sendMessage(
    m.chat,
    {
      audio: { url: download },
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      ptt: false
    },
    { quoted: m }
  )
  return title
}

async function sendVideoDownload(conn, m, url) {
  const { download, title } = await getOurinVideo(url)
  await conn.sendMessage(
    m.chat,
    {
      video: { url: download },
      mimetype: "video/mp4",
      fileName: `${title}.mp4`
    },
    { quoted: m }
  )
  return title
}

// ===== HANDLER PRINCIPAL =====

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    // texto real: `text` es args después de .play, `m.text` es mensaje completo
    const textParam = (text || "").trim()
    const fullText = (m.text || "").trim()

    // --- Detectar click de botón: "mp3 <url>" o "mp4 <url>" ---
    // El botón envía ".play mp3 https://youtu.be/..." → textParam = "mp3 https://..."
    let btnMatch = textParam.match(/^(mp3|mp4)\s+(https?:\/\/\S+)/i)
    if (!btnMatch) {
      // fallback: quitar prefijo+comando de fullText
      const withoutPrefix = fullText.replace(new RegExp(`^${usedPrefix || "\\."}${command}\\s*`, "i"), "").trim()
      btnMatch = withoutPrefix.match(/^(mp3|mp4)\s+(https?:\/\/\S+)/i)
    }

    if (btnMatch) {
      const format = btnMatch[1].toLowerCase()
      const url = btnMatch[2]
      if (!isYouTubeUrl(url)) return m.reply("🚫 URL de YouTube no válida.")

      await m.react(format === "mp3" ? "🎵" : "🎬")
      const waitMsg = await conn.sendMessage(m.chat, { text: format === "mp3" ? "🎵 Descargando audio con API Shadow..." : "🎬 Descargando video con API Ourin..." }, { quoted: m })

      try {
        if (format === "mp3") {
          const title = await sendAudioDownload(conn, m, url)
          try {
            await conn.sendMessage(m.chat, { text: `✅ *Audio completado*\n\n🎼 *Título:* ${title}\n🔗 ${url}`, edit: waitMsg.key })
          } catch { await m.reply(`✅ *Audio completado*\n\n🎼 *Título:* ${title}`) }
        } else {
          const title = await sendVideoDownload(conn, m, url)
          try {
            await conn.sendMessage(m.chat, { text: `✅ *Video completado*\n\n🎬 *Título:* ${title}\n🔗 ${url}`, edit: waitMsg.key })
          } catch { await m.reply(`✅ *Video completado*\n\n🎬 *Título:* ${title}`) }
        }
        await m.react("✅")
      } catch (e) {
        console.error(`[PLAY ${format}]`, e)
        await m.reply(`❌ Error al descargar ${format}: ${e.message}`)
        await m.react("❌")
      }
      return
    }

    // --- Sin botón: es búsqueda ---
    const query = textParam || fullText.replace(new RegExp(`^${usedPrefix || "\\."}${command}\\s*`, "i"), "").trim()
    if (!query) {
      return m.reply(
        `🔎 *ᴘʟᴀʏ — SHADOW x OURIN*\n\n` +
        `> Busca en YouTube y elige *MP3* (audio Shadow) o *MP4* (video Ourin).\n\n` +
        `*Ejemplo:*\n` +
        `• ${usedPrefix}play komang\n` +
        `• ${usedPrefix}play https://youtu.be/xxxx\n\n` +
        `📌 _Audio usa_ \`api-gohan-v1.onrender.com\`\n` +
        `🎬 _Video usa_ \`firefly.maiku.my.id\` (OurinNextGen)`
      )
    }

    await m.react("🔎")

    // Si es URL directa, igual buscamos para obtener info y mostrar botones
    let searchQuery = query
    // yt-search soporta URL, pero para info usamos yts
    const search = await yts(searchQuery)
    if (!search?.videos?.length) {
      await m.react("❌")
      return m.reply("❌ No se encontró resultado para: " + query)
    }

    const video = search.videos[0]
    const title = video.title || "Desconocido"
    const authorName = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const views = formatViews(video.views)
    const ago = video.ago || ""
    const url = video.url
    const thumbnailUrl = video.thumbnail

    // Info texto estilo ourin
    let info = `🔎 *RESULTADO SHADOW x OURIN*\n\n`
    info += `📌 *Título:* ${title}\n\n`
    info += `*DETALLES*\n`
    info += `👤 Canal: *${authorName}*\n`
    info += `⏱️ Duración: *${duration}*\n`
    info += `👀 Vistas: *${views}*\n`
    if (ago) info += `📅 Subido: *${ago}*\n`
    info += `🆔 ID: \`${video.videoId}\`\n\n`
    if (video.description) {
      const desc = video.description.substring(0, 140).replace(/\n/g, " ")
      info += `*Descripción:*\n_${desc}${video.description.length > 140 ? "..." : ""}_\n\n`
    }
    info += `🔗 ${url}\n\n`
    info += `_Elige un botón abajo:_\n`
    info += `🎵 *MP3* → Audio (Shadow API)\n`
    info += `🎬 *MP4* → Video (Ourin API)`

    // Thumbnail para locationMessage
    let jpegThumbnail
    try {
      if (thumbnailUrl) {
        const thumbRes = await axios.get(thumbnailUrl, { responseType: "arraybuffer", timeout: 15000 })
        jpegThumbnail = await sharp(Buffer.from(thumbRes.data)).resize(300, 170).jpeg().toBuffer()
      }
    } catch {
      try {
        const fb = await fetch("https://i.ibb.co/83pbxQN/5eecaebbc7c3.jpg")
        jpegThumbnail = Buffer.from(await fb.arrayBuffer())
      } catch { jpegThumbnail = undefined }
    }

    const prefix = usedPrefix || "."

    // Contenido con botones (estilo ourin original con buttonsMessage + locationMessage)
    const buttonsContent = {
      buttonsMessage: {
        buttons: [
          {
            buttonId: `${prefix}play mp3 ${url}`,
            buttonText: { displayText: "🎵 MP3" },
            type: 1,
          },
          {
            buttonId: `${prefix}play mp4 ${url}`,
            buttonText: { displayText: "🎬 MP4" },
            type: 1,
          },
        ],
        contentText: info,
        footerText: "🍅 Shadow x Ourin — Selecciona formato",
        headerType: 6,
        // locationMessage como header visual (ourin)
        ...(jpegThumbnail
          ? {
              locationMessage: {
                jpegThumbnail,
              },
            }
          : {}),
      },
    }

    // Algunos clientes no soportan locationMessage sin name, alternativa con header
    // Si no hay thumbnail, usamos contentText solo
    try {
      const msg = generateWAMessageFromContent(
        m.chat,
        { buttonsMessage: buttonsContent.buttonsMessage },
        { userJid: conn.user.jid, quoted: m }
      )
      await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    } catch (e) {
      // Fallback: si buttonsMessage falla, enviar con image + botones nativos
      console.warn("[PLAY] buttonsMessage falló, fallback a image+buttons:", e.message)
      try {
        const thumb = jpegThumbnail || Buffer.from(await (await fetch("https://i.ibb.co/83pbxQN/5eecaebbc7c3.jpg")).arrayBuffer())
        await conn.sendMessage(
          m.chat,
          {
            image: thumb,
            caption: info,
            footer: "🍅 Shadow x Ourin — Selecciona formato",
            buttons: [
              { buttonId: `${prefix}play mp3 ${url}`, buttonText: { displayText: "🎵 MP3" }, type: 1 },
              { buttonId: `${prefix}play mp4 ${url}`, buttonText: { displayText: "🎬 MP4" }, type: 1 },
            ],
            headerType: 4,
          },
          { quoted: m }
        )
      } catch (e2) {
        // Último fallback: solo texto con instrucciones manuales
        await conn.sendMessage(m.chat, { text: info + `\n\n*Responde con:*\n• \`${prefix}play mp3 ${url}\` para audio\n• \`${prefix}play mp4 ${url}\` para video` }, { quoted: m })
      }
    }

    await m.react("✅")
  } catch (e) {
    console.error("[PLAY híbrido]", e)
    await m.reply(`❌ Error en play: ${e.message}`)
    await m.react("❌")
  }
}

handler.help = ["play <consulta>"]
handler.tags = ["descargas"]
handler.command = ["play", "playaudio", "ytaudio"]
handler.register = false

export default handler
