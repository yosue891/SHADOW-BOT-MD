import moment from "moment-timezone"

let handler = async (m, { conn, text }) => {
  try {
    const chatId = m.chat
    const isGroup = chatId.endsWith('@g.us')

    await conn.sendMessage(chatId, { react: { text: '🎃', key: m.key } })

    if (!isGroup) {
      await conn.sendMessage(chatId, {
        text: `🎃🦇 Este ritual solo puede ejecutarse dentro de un aquelarre (grupo).`,
        quoted: m
      })
      return
    }

    const metadata = await conn.groupMetadata(chatId)
    const participants = metadata.participants
    const mentionIds = participants.map(p => p.id)

    const extraMsg = (text || '').trim()

    let caption = 
`┏━━━━━━━━━━━━━━━━━━━┓
🎃 Invocación del Aquelarre 🦇
┗━━━━━━━━━━━━━━━━━━━┛

🕯️ Aquelarre: *${metadata.subject}*
👻 Almas: *${participants.length}*`

    if (extraMsg) caption += `\n🕸️ Mensaje: *${extraMsg}*`

    caption += `\n\n⚰️ Convocatoria de Sombras:\n`
    caption += participants.map(p => `» @${p.id.split('@')[0]}`).join('\n')

    const vs = "^1.3.2"
    caption += `\n\n🎃 Versión: *${vs}*`
    caption += `\n『🎃』 En la noche de Halloween, todos responden a la llamada de Lord Shadow. 🦇`

    await conn.sendMessage(chatId, {
      image: { url: 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg' },
      caption,
      mentions: mentionIds,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363403739366547@newsletter",
          serverMessageId: '',
          newsletterName: '🎃 SHADOW GARDEN • HALLOWEEN 🦇'
        },
        forwardingScore: 9999999,
        isForwarded: true,
        mentionedJid: mentionIds
      }
    }, { quoted: m })

  } catch (error) {
    console.error('❌ Error en el comando tagall:', error)
    await conn.sendMessage(m.chat, {
      text: `❒ Ocurrió un error al ejecutar el comando *tagall*.`,
      quoted: m
    })
  }
}

handler.help = ['invocar']
handler.tags = ['grupos']
handler.command = ['tagall', 'invocar', 'todos']
handler.group = true
handler.admin = true

export default handler
