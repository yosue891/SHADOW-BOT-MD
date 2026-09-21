import moment from "moment-timezone"

let handler = async (m, { conn, text }) => {
  try {
    const chatId = m.chat
    const isGroup = chatId.endsWith('@g.us')

    await conn.sendMessage(chatId, { react: { text: '🌑', key: m.key } })

    if (!isGroup) {
      await conn.sendMessage(chatId, {
        text: `❒ Este comando solo puede ejecutarse dentro de grupos.`,
        quoted: m
      })
      return
    }

    const metadata = await conn.groupMetadata(chatId)
    const participants = metadata.participants
    const mentionIds = participants.map(p => p.id)

    // `text` ya viene SIN el comando desde src/handler.js.
    // Antes se hacía split+slice(1) y se perdía la primera palabra
    // (.tagall hola → enviaba vacío). Ahora se usa directo.
    const extraMsg = (text || '').trim()

    let caption = 
`┏━━━━━━━━━━━━━━━━━━━┓
⚔️ Invocación Sombría ⚔️
┗━━━━━━━━━━━━━━━━━━━┛

✐ Grupo: *${metadata.subject}*
ⴵ Miembros: *${participants.length}*`

    if (extraMsg) caption += `\n✰ Mensaje: *${extraMsg}*`

    caption += `\n\n❒ Menciones:\n`
    caption += participants.map(p => `» @${p.id.split('@')[0]}`).join('\n')

    const vs = "^1.3.2"
    caption += `\n\n🌌 Versión: *${vs}*`
    caption += `\n『☽』 En el jardín sombrío, todos responden al llamado de las sombras.`

    await conn.sendMessage(chatId, {
      image: { url: 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg' },
      caption,
      mentions: mentionIds,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363403739366547@newsletter",
          serverMessageId: '',
          newsletterName: 'Shadow Garden Oficial'
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
