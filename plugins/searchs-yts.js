import yts from "yt-search"
import fetch from "node-fetch"
import baileys from "@whiskeysockets/baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = baileys

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply(`🌑✦ Ingresa una búsqueda de YouTube.`)

  try {
    await m.react("🕸️")

    const results = await yts(text)
    const videos = results.all.filter(v => v.type === "video")
    if (!videos.length) throw new Error("No se encontraron resultados.")

    const first = videos[0]

    // Imagen pequeña estilo WhatsApp Business
    const smallThumb = await (await fetch("https://i.postimg.cc/rFfVL8Ps/image.jpg")).buffer()

    const businessHeader = {
      key: { participants: "0@s.whatsapp.net", fromMe: false, id: "ShadowYT" },
      message: {
        locationMessage: {
          name: "🔍 YouTube Search",
          jpegThumbnail: smallThumb,
          vcard:
            "BEGIN:VCARD\n" +
            "VERSION:3.0\n" +
            "N:;YouTube;;;\n" +
            "FN:YouTube\n" +
            "ORG:Shadow Garden\n" +
            "TITLE:\n" +
            "item1.TEL;waid=5804242773183:+58 0424-2773183\n" +
            "item1.X-ABLabel:Buscador\n" +
            "X-WA-BIZ-DESCRIPTION:Resultados de búsqueda en las sombras\n" +
            "X-WA-BIZ-NAME:YouTube Search\n" +
            "END:VCARD"
        }
      },
      participant: "0@s.whatsapp.net"
    }

    // Imagen grande del primer video
    const bigThumb = await prepareWAMessageMedia(
      { image: { url: first.thumbnail } },
      { upload: conn.waUploadToServer }
    )

    // Paso 1: enviar imagen preview con texto
    await conn.sendMessage(m.chat, {
      image: { url: first.thumbnail },
      caption: `🌑✦ Resultados para: *${text}*\n\n🜸 *${first.title}*\n⏱ ${first.timestamp} • 👁️ ${first.views.toLocaleString()}\n🔗 ${first.url}`
    }, { quoted: businessHeader })

    // Paso 2: catálogo nativo con los demás resultados
    const rows = videos.slice(0, 20).map(v => ({
      title: v.title,
      description: `Canal: ${v.author.name}`,
      id: v.url
    }))

    const sections = [
      {
        title: "RESULTADOS DE YOUTUBE",
        highlight_label: "🔎",
        rows
      }
    ]

    const interactive = proto.Message.InteractiveMessage.fromObject({
      body: { text: `🌑✦ Selecciona un video para reproducir:` },
      footer: { text: "Shadow Garden — YouTube Search" },
      header: {
        hasMediaAttachment: true,
        imageMessage: bigThumb.imageMessage
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "📜 Seleccionar video",
              sections
            })
          }
        ],
        messageParamsJson: ""
      },
      contextInfo: {
        mentionedJid: [m.sender]
      }
    })

    const msg = generateWAMessageFromContent(
      m.chat,
      { viewOnceMessage: { message: { interactiveMessage: interactive } } },
      { quoted: businessHeader }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await m.react("✔️")

  } catch (e) {
    await m.react("✖️")
    m.reply(`⚠️ Error:\n${e.message}`)
  }
}

handler.command = ["ytbuscar", "ytsearch", "yts"]
export default handler
