import yts from "yt-search"
import fetch from "node-fetch"
import baileys from "@whiskeysockets/baileys"
const { generateWAMessageFromContent, generateWAMessageContent, proto } = baileys

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply("🎶 Ingresa el nombre del video de YouTube.")

  await m.react("🕘")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "Desconocidas"
    let thumbnail = ""

    // 🔎 Si no es enlace, buscar en YouTube
    if (!text.startsWith("https://")) {
      const res = await yts(text)
      if (!res?.videos?.length) return m.reply("🚫 No encontré nada.")
      const video = res.videos[0]
      title = video.title
      authorName = video.author?.name
      durationTimestamp = video.timestamp
      views = video.views
      url = video.url
      thumbnail = video.thumbnail
    }

    const vistas = formatViews(views)

    // 🔥 Imagen pequeña estilo WhatsApp Business
    const res3 = await fetch("https://files.catbox.moe/wfd0ze.jpg")
    const thumb3 = Buffer.from(await res3.arrayBuffer())

    const businessHeader = {
      key: { participants: "0@s.whatsapp.net", fromMe: false, id: "BizHeader" },
      message: {
        locationMessage: {
          name: `『 ${title} 』`,
          jpegThumbnail: thumb3,
          vcard:
            "BEGIN:VCARD\n" +
            "VERSION:3.0\n" +
            "N:;Shadow;;;\n" +
            "FN:Shadow\n" +
            "ORG:Shadow Garden\n" +
            "TITLE:\n" +
            "item1.TEL;waid=5804242773183:+58 0424-2773183\n" +
            "item1.X-ABLabel:Shadow\n" +
            "X-WA-BIZ-DESCRIPTION:Descarga invocada desde el Reino de las Sombras\n" +
            "X-WA-BIZ-NAME:Shadow Garden\n" +
            "END:VCARD"
        }
      },
      participant: "0@s.whatsapp.net"
    }

    const caption = `
✧━───『 𝙸𝚗𝚏𝚘 𝚍𝚎𝚕 𝚅𝚒𝚍𝚎𝚘 』───━✧

🎼 𝑻𝒊́𝒕𝒖𝒍𝒐: ${title}
📺 𝑪𝒂𝒏𝒂𝒍: ${authorName}
👁️ 𝑽𝒊𝒔𝒕𝒂𝒔: ${vistas}
⏳ 𝑫𝒖𝒓𝒂𝒄𝒊𝒐́𝒏: ${durationTimestamp}
🌐 𝑬𝒏𝒍𝒂𝒄𝒆: ${url}

✧━───『 𝑺𝒉𝒂𝒅𝒐𝒘 𝑩𝒐𝒕 』───━✧
⚡ 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 𝒀𝒐𝒔𝒖𝒆 ⚡
`

    const thumb = (await conn.getFile(thumbnail)).data

    // 🔥 Generar contenido multimedia
    const media = await generateWAMessageContent({
      image: { url: thumbnail },
      caption
    }, { upload: conn.waUploadToServer })

    // 🔥 Mensaje interactivo con botones
    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: caption },
            footer: { text: "⚡ Shadow — Descargas rápidas ⚡" },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_copy",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Copiar enlace",
                    copy_code: url
                  })
                },
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Abrir en YouTube",
                    url,
                    merchant_url: url
                  })
                },
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Descargar MP3",
                    url: `${usedPrefix}play ${url}`,
                    merchant_url: `${usedPrefix}play ${url}`
                  })
                }
              ]
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: false
            }
          })
        }
      }
    }, { quoted: businessHeader })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

    // 🔥 DESCARGA AUTOMÁTICA (usa tu API Adonix)
    await downloadMedia(conn, m, url, "mp3")

    await m.react("✅")
  } catch (e) {
    m.reply("❌ Error: " + e.message)
    m.react("⚠️")
  }
}

const fetchBuffer = async (url) => {
  const response = await fetch(url)
  return await response.buffer()
}

const downloadMedia = async (conn, m, url, type) => {
  try {
    const msg = type === "mp3"
      ? "🎵 Descargando audio..."
      : "🎬 Descargando video..."

    const sent = await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

    const apiUrl = type === "mp3"
      ? `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(url)}&apikey=SHADOWBOTKEYMD`
      : `https://api-adonix.ultraplus.click/download/ytvideo?url=${encodeURIComponent(url)}&apikey=SHADOWBOTKEYMD`

    const r = await fetch(apiUrl)
    const data = await r.json()

    if (!data?.status || !data?.data?.url) return m.reply("🚫 No se pudo descargar el archivo.")

    const fileUrl = data.data.url
    const fileTitle = cleanName(data.data.title || "video")

    if (type === "mp3") {
      await conn.sendMessage(
        m.chat,
        { audio: { url: fileUrl }, mimetype: "audio/mpeg", fileName: fileTitle + ".mp3", ptt: true },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        { video: { url: fileUrl }, mimetype: "video/mp4", fileName: fileTitle + ".mp4" },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      { text: `✅ Descarga completada\n\n🎼 Título: ${fileTitle}`, edit: sent.key }
    )

    await m.react("✅")
  } catch (e) {
    console.error(e)
    m.reply("❌ Error: " + e.message)
    m.react("💀")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

const formatViews = (views) => {
  if (views === undefined || views === null) return "No disponible"
  if (views >= 1000000000) return `${(views / 1000000000).toFixed(1)}B`
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

handler.command = ["play", "yt", "ytsearch"]
handler.tags = ["descargas"]
handler.register = true

export default handler
