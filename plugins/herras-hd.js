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
      {
        text: "Mejorando la calidad de la imagen... espera un momento 🧪"
      },
      { quoted: msg }
    )

    const WA = ensureWA(wa, conn)
    if (!WA) {
      await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } })
      return conn.sendMessage(
        chatId,
        { text: "Error interno: no se encontró el módulo de descarga." },
        { quoted: msg }
      )
    }

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

    if (!json?.result_url || !json.result_url.startsWith("http")) {
      throw new Error("No se pudo obtener la imagen mejorada desde Pixelcut.")
    }

    const resultBuffer = await (await fetch(json.result_url)).buffer()

    await conn.sendMessage(
      chatId,
      {
        image: resultBuffer,
        caption: ""
      },
      { quoted: msg }
    )

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } })
  } catch (err) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } })
    await conn.sendMessage(
      chatId,
      {
        text: `Falló la mejora de imagen:\n${err.message}`
      },
      { quoted: msg }
    )
  }
}

handler.help = ["𝖧𝖽"]
handler.tags = ["𝖬𝖤𝖳𝖠 𝖨𝖠"]
handler.command = ["hd"]

export default handler
