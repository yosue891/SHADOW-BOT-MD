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

    const canalOficial = 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'

    // Thumbnail con timeout corto y sin bloquear el envío.
    // Antes un fetch sin timeout colgaba el comando minutos si GitHub iba lento.
    let thumbnail = null
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch('https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg', { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) thumbnail = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      console.error('Thumbnail tagall omitido:', e?.message || e)
      thumbnail = null
    }

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
        ...(thumbnail ? {
          externalAdReply: {
            title: `⚔️ Shadow Garden ⚔️`,
            body: `El llamado de las sombras ha sido emitido.`,
            previewType: "PHOTO",
            thumbnail,
            sourceUrl: canalOficial,
            showAdAttribution: true
          }
        } : {})
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
