import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import FormData from "form-data"
import {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateWAMessageContent
} from "@whiskeysockets/baileys"

global.wa = {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateWAMessageContent
}

// =====================
// UTILIDADES
// =====================

function unwrapMessage(m) {
  let n = m
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
  }
  return n
}

function ensureWA(wa, conn) {
  if (wa?.downloadContentFromMessage) return wa
  if (conn?.wa?.downloadContentFromMessage) return conn.wa
  if (global.wa?.downloadContentFromMessage) return global.wa
  return null
}

// =====================
// TARJETA META AI
// =====================

const sendMetaAICard = async (conn, chatId) => {
  const metaImg = await (await fetch("https://files.catbox.moe/wfd0ze.jpg")).buffer()

  const vcard = `
BEGIN:VCARD
VERSION:3.0
N:AI;Meta;;;
FN:Meta AI
ORG:Meta AI
TITLE:AI · Estado
PHOTO;ENCODING=b;TYPE=JPEG:${metaImg.toString("base64")}
END:VCARD
`.trim()

  await conn.sendMessage(chatId, {
    contacts: {
      displayName: "Meta AI",
      contacts: [
        {
          vcard,
          verifiedName: "Meta AI",
          businessOwnerJid: "meta@business.whatsapp.com"
        }
      ]
    }
  })
}

// =====================
// HANDLER
// =====================

const handler = async (msg, { conn, command, wa, usedPrefix }) => {
  const chatId = msg.key.remoteJid

  const pref = usedPrefix || global.prefixes?.[0] || "."
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const caption = msg.message?.imageMessage?.caption || ""
  const body = (text || caption || "").toLowerCase()

  if (!body.startsWith(pref + command)) return

  let quoted = null
  const ctx = msg.message?.extendedTextMessage?.contextInfo
  const quotedRaw = ctx?.quotedMessage

  if (quotedRaw) {
    quoted = unwrapMessage(quotedRaw)
  } else if (msg.message?.imageMessage) {
    quoted = msg.message
  }

  const mime =
    quoted?.imageMessage?.mimetype ||
    quoted?.mimetype ||
    msg.message?.imageMessage?.mimetype ||
    ""

  if (!mime || !/image\/(jpe?g|png)/i.test(mime)) {
    await conn.sendMessage(chatId, { react: { text: "👀", key: msg.key } })
    return conn.sendMessage(
      chatId,
      {
        text: `Envía o responde a una imagen con:\n${pref + command}`,
        ...global.rcanal
      },
      { quoted: msg }
    )
  }

  try {
    await conn.sendMessage(chatId, { react: { text: "🕒", key: msg.key } })

    await conn.sendMessage(
      chatId,
      { text: "🧠 Meta AI está mejorando tu imagen..." },
      { quoted: msg }
    )

    const WA = ensureWA(wa, conn)
    if (!WA) throw new Error("Módulo WA no disponible")

    const stream = await WA.downloadContentFromMessage(quoted.imageMessage, "image")
    const buffer = []
    for await (const chunk of stream) buffer.push(chunk)
    const media = Buffer.concat(buffer)

    const ext = mime.split("/")[1]
    const filename = `image_${Date.now()}.${ext}`

    const form = new FormData()
    form.append("image", media, { filename, contentType: mime })
    form.append("scale", "2")

    const headers = {
      ...form.getHeaders(),
      accept: "application/json",
      "x-client-version": "web",
      "x-locale": "es"
    }

    const res = await fetch("https://api2.pixelcut.app/image/upscale/v1", {
      method: "POST",
      headers,
      body: form
    })

    const json = await res.json()
    if (!json?.result_url) throw new Error("Pixelcut no respondió")

    const resultBuffer = await (await fetch(json.result_url)).buffer()

    // 🧠 ENVÍA TARJETA META AI
    await sendMetaAICard(conn, chatId)

    // 🖼️ IMAGEN HD FINAL
    await conn.sendMessage(
      chatId,
      {
        image: resultBuffer,
        caption: "✨ Imagen mejorada por Meta AI"
      },
      { quoted: msg }
    )

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } })
  } catch (err) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } })
    await conn.sendMessage(
      chatId,
      { text: `❌ Error:\n${err.message}` },
      { quoted: msg }
    )
  }
}

handler.help = ["hd"]
handler.tags = ["META IA"]
handler.command = ["hd"]

export default handler
