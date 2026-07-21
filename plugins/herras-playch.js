import yts from "yt-search"
import fetch from "node-fetch"
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`[ 🕸️ ] Formato incorrecto. Revela el portal usando:\n${usedPrefix + command} id_del_canal | nombre o enlace de la música`)

  const parts = text.split('|')
  if (parts.length < 2) return m.reply(`[ ⚠️ ] Separa el destino de la invocación usando la barra '|'. Ej:\n${usedPrefix + command} 120363300000000000@newsletter | Eminence in Shadow Theme`)

  const channelId = parts[0].trim()
  const searchQuery = parts.slice(1).join('|').trim()

  if (!channelId || !searchQuery) return m.reply(`[ 🕳️ ] El ID del canal o el rastro de la música se ha perdido en el vacío. Asegúrate de estructurar bien el comando.`)

  await m.react("🔥")

  let tempFiles = []

  try {
    let url = searchQuery
    let title = "Desconocido"
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
      url = res.url || url
      thumbnail = res.thumbnail || ""
    } else {
      const res = await yts(url)
      if (!res?.videos?.length) {
        if (m.react) await m.react("❌")
        return m.reply("[ 🕳️ ] La sombra buscó en los confines de la red y no encontró nada.")
      }

      const video = res.videos[0]
      title = video.title || title
      url = video.url || url
      thumbnail = video.thumbnail || ""
    }

    const sent = await conn.sendMessage(
      m.chat,
      { text: "[ ⏳ ] Invocando el arte prohibido..." },
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

    const dir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const audioPath = path.join(dir, `audio_${Date.now()}.mp3`)
    tempFiles.push(audioPath)
    const audioRes = await fetch(fileUrl)
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    await fs.promises.writeFile(audioPath, audioBuffer)

    const videoPath = path.join(dir, `video_${Date.now()}.mp4`)
    tempFiles.push(videoPath)

    let thumbPath = null
    if (thumbnail) {
      thumbPath = path.join(dir, `thumb_${Date.now()}.jpg`)
      tempFiles.push(thumbPath)
      try {
        const thumbRes = await fetch(thumbnail)
        const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer())
        await fs.promises.writeFile(thumbPath, thumbBuffer)
      } catch {
        thumbPath = null
      }
    }

    const thumbInput = thumbPath || thumbPath
    if (thumbPath) {
      execSync(
        `ffmpeg -y -loop 1 -i "${thumbPath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 128k -shortest -movflags +faststart "${videoPath}"`,
        { timeout: 60000, stdio: 'ignore' }
      )
    } else {
      execSync(
        `ffmpeg -y -f lavfi -i color=c=black:s=640x360:d=1 -i "${audioPath}" -c:v libx264 -c:a aac -b:a 128k -shortest -movflags +faststart "${videoPath}"`,
        { timeout: 60000, stdio: 'ignore' }
      )
    }

    const videoBuffer = await fs.promises.readFile(videoPath)

    const content = await generateWAMessageContent(
      { video: videoBuffer, ptv: true },
      {
        jid: channelId,
        upload: async (readStream, opts) => {
          const up = await conn.waUploadToServer(readStream, { ...opts, newsletter: true })
          return up
        }
      }
    )

    const channelMsg = generateWAMessageFromContent(channelId, content, { userJid: conn.user.id })
    await conn.relayMessage(channelId, channelMsg.message, { messageId: channelMsg.key.id })

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: `${fileTitle}.mp3`,
        ptt: false,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1,
          forwardedNewsletterMessageInfo: {
            newsletterJid: channelId,
            newsletterName: "Canal de las Sombras",
            serverMessageId: 100
          }
        }
      }
    )

    try {
      await conn.sendMessage(
        m.chat,
        {
          text: `⚔️ Transferencia dimensional completada.\n\n🎼 Título: ${fileTitle}\n👁️ Canal: ${channelId}`,
          edit: sent.key
        }
      )
    } catch {
      await m.reply(`⚔️ Transferencia dimensional completada.\n\n🎼 Título: ${fileTitle}`)
    }

    await m.react("⚔️")
  } catch (e) {
    console.error(e)
    await m.reply("[ 🩸 ] Las sombras detectaron una anomalía en el sistema: " + e.message)
    await m.react("⚠️")
  } finally {
    for (const f of tempFiles) {
      await fs.promises.unlink(f).catch(() => {})
    }
  }
}

const cleanName = (name) =>
  String(name).replace(/[^\w\s._-]/gi, "").substring(0, 50)

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
