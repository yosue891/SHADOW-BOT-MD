import fetch from "node-fetch"
import FormData from "form-data"

const META_IMG = "https://files.catbox.moe/wfd0ze.jpg"

const sendFakeMetaProfile = async (conn, chatId) => {
  const img = await (await fetch(META_IMG)).buffer()

  // 📸 IMAGEN PEQUEÑA (SIMULA PERFIL)
  await conn.sendMessage(chatId, {
    image: img,
    caption: "🧠 *Meta AI*\nAI · Estado"
  })
}

const sendMetaContact = async (conn, chatId) => {
  const vcard = `
BEGIN:VCARD
VERSION:3.0
N:AI;Meta;;;
FN:Meta AI
ORG:Meta AI
TITLE:AI · Estado
END:VCARD
`.trim()

  await conn.sendMessage(chatId, {
    contacts: {
      displayName: "Meta AI",
      contacts: [{ vcard }]
    }
  })
}

// =====================
// HANDLER
// =====================

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid
  const quoted = msg.message?.imageMessage ? msg : null

  if (!quoted) {
    return conn.sendMessage(chatId, {
      text: "👀 Responde a una imagen con *.hd*"
    })
  }

  try {
    await conn.sendMessage(chatId, { react: { text: "🕒", key: msg.key } })

    // 1️⃣ PERFIL META AI (VISIBLE)
    await sendFakeMetaProfile(conn, chatId)

    // 2️⃣ CONTACTO
    await sendMetaContact(conn, chatId)

    // 3️⃣ PROCESAR IMAGEN
    const stream = await conn.downloadContentFromMessage(
      quoted.message.imageMessage,
      "image"
    )

    const buffer = []
    for await (const chunk of stream) buffer.push(chunk)
    const media = Buffer.concat(buffer)

    const form = new FormData()
    form.append("image", media)
    form.append("scale", "2")

    const res = await fetch(
      "https://api2.pixelcut.app/image/upscale/v1",
      { method: "POST", body: form, headers: form.getHeaders() }
    )

    const json = await res.json()
    const hd = await (await fetch(json.result_url)).buffer()

    // 4️⃣ IMAGEN HD FINAL
    await conn.sendMessage(chatId, {
      image: hd,
      caption: "✨ Imagen mejorada por Meta AI"
    })

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } })
  } catch (e) {
    await conn.sendMessage(chatId, {
      text: "❌ Error procesando la imagen"
    })
  }
}

handler.command = ["hd"]
export default handler
