
import { searchYouTube } from "../../lib/youtube-search.js"
import { downloadYouTube } from "../../lib/apiowo.js"
import sharp from "sharp"
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "@whiskeysockets/baileys"

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

async function sendAudioDownload(conn, m, url) {
  const { download, title } = await downloadYouTube(url, "audio")
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
  const { download, title } = await downloadYouTube(url, "video")
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


const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    const textParam = (text || "").trim()
    const fullText = (m.text || "").trim()

    let btnMatch = textParam.match(/^(mp3|mp4)\s+(https?:\/\/\S+)/i)
    if (!btnMatch) {
      const withoutPrefix = fullText.replace(new RegExp(`^${usedPrefix || "\\."}${command}\\s*`, "i"), "").trim()
      btnMatch = withoutPrefix.match(/^(mp3|mp4)\s+(https?:\/\/\S+)/i)
    }

    if (btnMatch) {
      const format = btnMatch[1].toLowerCase()
      const url = btnMatch[2]
      if (!isYouTubeUrl(url)) return m.reply("🚫 URL de YouTube no válida.")

      await m.react(format === "mp3" ? "🎵" : "🎬")
      const waitMsg = await conn.sendMessage(m.chat, { text: format === "mp3" ? "🎵 Descargando audio con APIOWO..." : "🎬 Descargando video con APIOWO..." }, { quoted: m })

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

    const query = textParam || fullText.replace(new RegExp(`^${usedPrefix || "\\."}${command}\\s*`, "i"), "").trim()
    if (!query) {
      return m.reply(
        `🎃🦇 *ᴘʟᴀʏ — SHADOW GARDEN • HALLOWEEN* 🦇🎃\n\n` +
        `> Busca en YouTube desde la cripta y elige *MP3* (audio sombrío) o *MP4* (video de ultratumba).\n\n` +
        `*Ejemplo:*\n` +
        `• ${usedPrefix}play ghostbusters\n` +
        `• ${usedPrefix}play https://youtu.be/xxxx\n\n` +
        `⚡ _Servidor de descarga:_ \`apiowo.vercel.app\` 🚀`
      )
    }

    await m.react("🎃")

    let searchQuery = query
    const search = await searchYouTube(searchQuery)
    if (!search?.videos?.length) {
      await m.react("❌")
      return m.reply("❌ No se encontró ningún espíritu para: " + query)
    }

    const video = search.videos[0]
    const title = video.title || "Desconocido"
    const authorName = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const views = formatViews(video.views)
    const ago = video.ago || ""
    const url = video.url
    const thumbnailUrl = video.thumbnail

    let info = `🎃 *RESULTADO DE LA SOMBRA • HALLOWEEN* 🦇\n\n`
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
    info += `_Elige tu formato sombrío:_\n`
    info += `🎵 *MP3* → Audio espectral\n`
    info += `🎬 *MP4* → Video de ultratumba`

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

    let imageMessage = null
    if (jpegThumbnail && conn.waUploadToServer) {
      try {
        const media = await prepareWAMessageMedia({ image: jpegThumbnail }, { upload: conn.waUploadToServer })
        imageMessage = media?.imageMessage
      } catch (errUpload) {
        console.warn("[PLAY] No se pudo subir thumbnail para header interactivo:", errUpload?.message)
      }
    }

    const prefix = usedPrefix || "."
    let sent = false

    // 1. Intentar mensaje interactivo moderno (InteractiveMessage) con botones de respuesta rápida
    try {
      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: info }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: "🎃 SHADOW GARDEN • HALLOWEEN 🦇" }),
        header: proto.Message.InteractiveMessage.Header.create({
          title: "🎵 Selección de Formato",
          hasMediaAttachment: !!imageMessage,
          imageMessage: imageMessage || undefined
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🎵 MP3 (Audio) 🎃",
                id: `${prefix}play mp3 ${url}`
              })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🎬 MP4 (Video) 🦇",
                id: `${prefix}play mp4 ${url}`
              })
            }
          ]
        })
      })

      const userJid = conn.user?.jid || conn.user?.id || '0@s.whatsapp.net'
      const msg = generateWAMessageFromContent(
        m.chat,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage
            }
          }
        },
        { userJid, quoted: m?.message ? m : undefined }
      )

      if (conn.relayMessage) {
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        sent = true
      }
    } catch (errInteractive) {
      console.warn("[PLAY] Falló interactiveMessage, intentando envío estándar:", errInteractive?.message)
    }

    // 2. Fallback con imagen o texto plano si los botones interactivos no son admitidos
    if (!sent) {
      const captionText = info + `\n\n*Responde con:*\n• \`${prefix}play mp3 ${url}\` para audio 🎵\n• \`${prefix}play mp4 ${url}\` para video 🎬`
      if (jpegThumbnail) {
        await conn.sendMessage(
          m.chat,
          {
            image: jpegThumbnail,
            caption: captionText,
            footer: "🎃 SHADOW GARDEN • HALLOWEEN 🦇"
          },
          { quoted: m }
        )
      } else {
        await conn.sendMessage(
          m.chat,
          { text: captionText },
          { quoted: m }
        )
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
