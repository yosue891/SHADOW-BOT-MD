import moment from "moment-timezone"
import fetch from "node-fetch"

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

    const args = (text || '').trim().split(' ').slice(1)
    const extraMsg = args.join(' ')

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

    const thumbnail = await (await fetch('https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg')).buffer()
    const canalOficial = 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'

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
        mentionedJid: mentionIds,
        externalAdReply: {
          title: `⚔️ Shadow Garden ⚔️`,
          body: `El llamado de las sombras ha sido emitido.`,
          previewType: "PHOTO",
          thumbnail,
          sourceUrl: canalOficial,
          showAdAttribution: true
        }
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
