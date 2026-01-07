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

    const args = text.trim().split(' ').slice(1)
    const extraMsg = args.join(' ')

    let texto = 
`┏━━━━━━━━━━━━━━━━━━━┓
⚔️ *Invocación Sombría* ⚔️
┗━━━━━━━━━━━━━━━━━━━┛

✐ Grupo: *${metadata.subject}*
ⴵ Miembros: *${participants.length}*`

    if (extraMsg) texto += `\n✰ Mensaje: *${extraMsg}*`

    texto += `\n\n❒ Menciones:\n`
    texto += participants.map(p => `» @${p.id.split('@')[0]}`).join('\n')

    const vs = "1.0.0"
    texto += `\n\n🌌 Versión: *${vs}*`
    texto += `\n✨ 『☽』 *Las sombras invocan a todos los presentes en este jardín eterno...* ✨`

    await conn.sendMessage(chatId, {
      image: { url: 'https://files.catbox.moe/qjxuoj.jpg' }, 
      caption: texto,
      mentions: mentionIds,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363403739366547@newsletter",
        newsletterName: "Shadow Garden Oficial"
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
handler.tags = ['grupo']
handler.command = ['tagall', 'invocar', 'todos']
handler.group = true
handler.admin = true

export default handler
