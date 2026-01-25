import moment from 'moment-timezone'
import fetch from 'node-fetch'
import baileys from '@whiskeysockets/baileys'
const { generateWAMessageFromContent, generateWAMessageContent, proto } = baileys

let handler = async (m, { conn }) => {
  try {
    let res = await fetch('https://api.github.com/repos/yosue891/SHADOW-BOT-MD')
    if (!res.ok) throw new Error('Error al obtener datos del repositorio Shadow-BOT-MD')
    let json = await res.json()

    let txt = `*🌑⚔️  S H A D O W - B O T - M D  ⚔️🌑*\n\n`
    txt += `⚔️  *Nombre del Proyecto* : ${json.name}\n`
    txt += `👀  *Observadores en las Sombras* : ${json.watchers_count}\n`
    txt += `📦  *Tamaño del Dominio* : ${(json.size / 1024).toFixed(2)} MB\n`
    txt += `🕰️  *Última Invocación* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`
    txt += `🔗  *Portal Secreto* : ${json.html_url}\n`
    txt += `🌌  *Clones en las Sombras* : ${json.forks_count}\n`
    txt += `⭐  *Estrellas en la Oscuridad* : ${json.stargazers_count}\n\n`
    txt += `『☽』 *En las sombras, el poder se oculta tras la calma...*\n\n`
    txt += `👑  *Creador*: Yosue`

    // Cargar imagen para el header
    const media = await generateWAMessageContent(
      { image: { url: 'https://files.catbox.moe/owpjte.jpg' } },
      { upload: conn.waUploadToServer }
    )

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: txt },
            footer: { text: 'Shadow-BOT-MD' },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📦 Repositorio del Bot',
                    url: json.html_url
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📞 Reportar un problema',
                    url: 'https://wa.me/5804242773183'
                  })
                }
              ],
              messageParamsJson: ''
            },
            contextInfo: {
              mentionedJid: [m.sender],
              externalAdReply: {
                title: 'Shadow-BOT-MD',
                body: 'El poder oculto en las sombras',
                thumbnailUrl: 'https://files.catbox.moe/owpjte.jpg',
                sourceUrl: json.html_url,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          })
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (e) {
    await conn.reply(m.chat, `🌑⚔️ Error en el dominio de las sombras:\n${e}`, m)
  }
}

handler.help = ['script']
handler.tags = ['main']
handler.command = ['script', 'sc']
handler.register = true

export default handler
