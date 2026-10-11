import moment from 'moment-timezone'
import fetch from 'node-fetch'
import { generateWAMessageFromContent, generateWAMessageContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
  try {
    await m.react('🎃')
    let res = await fetch('https://api.github.com/repos/yosue891/SHADOW-BOT-MD')
    if (!res.ok) throw new Error('Error al obtener datos del repositorio Shadow-BOT-MD')
    let json = await res.json()

    let txt = `*🎃🦇  S H A D O W - B O T - M D • H A L L O W E E N  🦇🎃*\n\n`
    txt += `⚰️  *Grimorio del Proyecto* : ${json.name}\n`
    txt += `👀  *Espectros en las Sombras* : ${json.watchers_count}\n`
    txt += `📦  *Tamaño del Dominio* : ${(json.size / 1024).toFixed(2)} MB\n`
    txt += `🕰️  *Última Invocación* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`
    txt += `🔗  *Portal Secreto* : ${json.html_url}\n`
    txt += `🌌  *Clones de Ultratumba* : ${json.forks_count}\n`
    txt += `⭐  *Estrellas de la Noche Eterna* : ${json.stargazers_count}\n\n`
    txt += `『🎃』 *En la noche de brujas, el poder de las sombras se desata...*\n\n`
    txt += `👑  *Lord Shadow*: Yosue`

    const thumbBuffer = await (await fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')).buffer()

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ShadowScript' },
      message: {
        locationMessage: {
          name: '📜 script',
          jpegThumbnail: thumbBuffer,
          vcard:
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'N:;script;;;\n' +
            'FN:script\n' +
            'ORG:Shadow Garden Halloween\n' +
            'TITLE:\n' +
            'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
            'item1.X-ABLabel:Creador\n' +
            'X-WA-BIZ-DESCRIPTION:Repositorio oficial de Shadow Garden Halloween\n' +
            'X-WA-BIZ-NAME:script\n' +
            'END:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    const media = await generateWAMessageContent(
      { image: { url: 'https://files.catbox.moe/owpjte.jpg' } },
      { upload: conn.waUploadToServer }
    )

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: txt },
            footer: { text: '🎃 SHADOW-BOT-MD • HALLOWEEN 🦇' },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📦 Grimorio del Bot 🎃',
                    url: json.html_url
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📞 Contactar a Lord Shadow',
                    url: 'https://wa.me/5804242773183'
                  })
                }
              ],
              messageParamsJson: ''
            },
            contextInfo: {
              mentionedJid: [m.sender]
            }
          })
        }
      }
    }, { quoted: fkontak })

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
