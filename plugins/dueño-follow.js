import ws from "ws"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
`╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐅𝐎𝐋𝐋𝐎𝐖 」─╮

Invoca correctamente el comando...

✍️ Uso:
*${usedPrefix + command}* <link del canal>

Ejemplo:
*${usedPrefix + command}* https://whatsapp.com/channel/XXXXXXXX

╰─「 🌌 𝐄𝐑𝐑𝐎𝐑 」─╯`)
    }

    const bots = [
      global.conn,
      ...(Array.isArray(global.conns) ? global.conns : [])
    ].filter(v => v?.user?.jid && v?.ws?.socket && v.ws.socket.readyState !== ws.CLOSED)

    const subBots = bots.filter(v => v.user.jid !== global.conn.user.jid)

    const input = text.trim()

    async function resolveChannelJid(value, sock) {
      if (/@newsletter$/i.test(value)) return value

      const inviteMatch =
        value.match(/channel\/([A-Za-z0-9_-]+)/i) ||
        value.match(/invite\/([A-Za-z0-9_-]+)/i) ||
        value.match(/([A-Za-z0-9_-]{10,})/)

      const inviteCode = inviteMatch?.[1]
      if (!inviteCode) return null

      if (typeof sock.newsletterMetadata === "function") {
        const meta = await sock.newsletterMetadata("invite", inviteCode)
        return (
          meta?.id ||
          meta?.jid ||
          meta?.newsletter?.jid ||
          meta?.channel?.jid ||
          null
        )
      }

      return null
    }

    const results = []
    const mainSock = global.conn

    const channelJid = await resolveChannelJid(input, mainSock)
    if (!channelJid) {
      return m.reply(
`╭─「 ❌ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐄𝐑𝐑𝐎𝐑 」─╮

No se pudo invocar el canal...

⚠️ Enlace inválido o invite incorrecto.

╰─「 🌑 」─╯`)
    }

    for (const bot of subBots) {
      const name = bot.user?.name || bot.user?.jid || "Sub-Bot"
      try {
        if (typeof bot.newsletterFollow !== "function") {
          results.push(`❌ ${name}`)
          continue
        }

        await bot.newsletterFollow(channelJid)
        results.push(`✅ ${name}`)
      } catch (e) {
        results.push(`❌ ${name}`)
      }
    }

    const ok = results.filter(v => v.startsWith("✅")).length
    const fail = results.filter(v => v.startsWith("❌")).length

    const userTag = m.sender.split("@")[0]

    return m.reply(
`╭─「 👻 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍: 𝐅𝐎𝐋𝐋𝐎𝐖 」─╮

@${userTag} ha invocado a los sub-bots...

El canal ha sido marcado como objetivo.

╰─「 🌌 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎 」─╯
📡 Canal: ${channelJid}
🤖 Sub-Bots: ${subBots.length}

✅ Éxitos: ${ok}
❌ Fallos: ${fail}

📜 Registro:
${results.join("\n")}

╰─「 🌑 𝐅𝐈𝐍 」─╯`,
      null,
      { mentions: [m.sender] }
    )

  } catch (error) {
    return m.reply(
`╭─「 ⚠️ 𝐄𝐑𝐑𝐎𝐑 」─╮
${error.message}
╰─「 🌑 」─╯`)
  }
}

handler.help = ["followchannel <link>"]
handler.tags = ["owner"]
handler.command = ["followchannel"]
handler.rowner = true

export default handler
