import fetch from "node-fetch"

const CHANNEL_MSG_REGEX = /https:\/\/whatsapp\.com\/channel\/[A-Za-z0-9]+\/\d+/i

let handler = async (m, { conn, text }) => {
  try {
    if (!text || !text.trim()) {
      return m.reply(
        "⚠️ Usa el formato:\n\n*.react 😣,🤨,😭,❤️ https://whatsapp.com/channel/XXXXXXXX/1234*"
      )
    }

    // 1) Extraer el link del mensaje del canal desde el texto completo
    const linkMatch = text.match(CHANNEL_MSG_REGEX)
    if (!linkMatch) {
      return m.reply("⚠️ Ingresa un link válido de mensaje de canal de WhatsApp.\nEjemplo: *.react 😣,🤨,😭,❤️ https://whatsapp.com/channel/XXXXXXXX/1234*")
    }
    const messageLink = linkMatch[0]

    // 2) La parte de emojis es todo lo que está antes del link
    const emojisPart = text.replace(messageLink, "").trim()

    // Normalizar comas (latinas y chinas) y espacios
    const normalized = emojisPart
      .replace(/，/g, ",") // coma china a coma normal
      .replace(/\s+/g, "") // quitar espacios para evitar cortes raros

    // 3) Separar por comas y filtrar vacíos
    const emojis = normalized.split(",").map(e => e.trim()).filter(Boolean)

    if (emojis.length !== 4) {
      return m.reply(
        "⚠️ Debes ingresar exactamente 4 emojis separados por comas.\n\nEjemplo: *.react 😣,🤨,😭,❤️ https://whatsapp.com/channel/XXXXXXXX/1234*"
      )
    }

    await m.react("🕒")

    // 4) Construir payload para la API
    const payload = {
      link: messageLink,
      emojis,
      count: 1000
    }

    const apiUrl = "https://api-adonix.ultraplus.click/tools/react?apikey=SHADOWBOTMDKEY"

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const json = await res.json().catch(() => null)

    if (!json || !json.status) {
      await m.react("❌")
      return m.reply("⚠️ No se pudieron enviar las reacciones.\n" + (json?.error || "Error desconocido o respuesta inválida de la API."))
    }

    await m.react("✅")
    return m.reply(
      `✨ Se enviaron 1000 reacciones al mensaje:\n${messageLink}\n\nCon los emojis: ${emojis.join(" ")}`
    )

  } catch (e) {
    console.error(e)
    await m.react("❌")
    return m.reply("⚠️ Error al procesar la petición: " + e.message)
  }
}

handler.help = ["react 😣,🤨,😭,❤️ <link_del_mensaje>"]
handler.tags = ["tools"]
handler.command = ["react"]

export default handler
