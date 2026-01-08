import fetch from "node-fetch"

let handler = async (m, { conn, args }) => {
  try {
    if (args.length < 2) {
      return m.reply("⚠️ Usa el formato:\n\n*.react 😫,🧐,😭,♥️ <link_del_mensaje>*")
    }

    // Los emojis vienen en un solo argumento separados por comas
    const emojisArg = args[0]
    const emojis = emojisArg.split(",").map(e => e.trim()).filter(e => e)

    if (emojis.length !== 4) {
      return m.reply("⚠️ Debes ingresar exactamente 4 emojis separados por comas.\n\nEjemplo: *.react 😫,🧐,😭,♥️ <link>*")
    }

    // El segundo argumento es el link del mensaje del canal
    const messageLink = args[1]

    if (!messageLink.startsWith("https://whatsapp.com/channel/")) {
      return m.reply("⚠️ Ingresa un link válido de mensaje de canal de WhatsApp.")
    }

    await m.react("🕒")

    const payload = {
      link: messageLink,
      emojis: emojis,
      count: 1000 // cantidad de reacciones
    }

    const apiUrl = "https://api-adonix.ultraplus.click/tools/react?apikey=SHADOWBOTMDKEY"

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const json = await res.json()

    if (!json?.status) {
      await m.react("❌")
      return m.reply("⚠️ No se pudieron enviar las reacciones.\n" + (json?.error || "Error desconocido"))
    }

    await m.react("✅")
    return m.reply(`✨ Se enviaron 1000 reacciones al mensaje:\n${messageLink}\n\nCon los emojis: ${emojis.join(" ")}`)

  } catch (e) {
    console.error(e)
    await m.react("❌")
    return m.reply("⚠️ Error al procesar la petición: " + e.message)
  }
}

handler.help = ["react 😫,🧐,😭,♥️ <link>"]
handler.tags = ["tools"]
handler.command = ["react"]

export default handler
