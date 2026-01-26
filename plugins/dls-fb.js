import fetch from 'node-fetch'
import baileys from '@whiskeysockets/baileys'
const { generateWAMessageFromContent, generateWAMessageContent, proto } = baileys

const handler = async (m, { args, conn, usedPrefix, command }) => {
  try {
    if (!args[0]) {
      return conn.reply(m.chat, '「✦」Debes entregar un portal válido de Facebook.', m)
    }

    await m.react('🕒')

    let data = []

    // API — Delirius
    try {
      const api = `${global.APIs.delirius.url}/download/facebook?url=${encodeURIComponent(args[0])}`
      const res = await fetch(api)
      const json = await res.json()
      if (json.status && json.data?.length) {
        data = json.data.map(v => v.url)
      }
    } catch {}

    if (!data.length) {
      return conn.reply(m.chat, '「✦」Las sombras no pudieron extraer el contenido.', m)
    }

    const videoURL = data[0] // SOLO EL PRIMER VIDEO

    // HEADER WHATSAPP BUSINESS
    const header = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'ShadowHeaderFB' },
      message: {
        locationMessage: {
          name: '𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 🜸',
          jpegThumbnail: await (await fetch('https://files.catbox.moe/31u6f5.jpg')).buffer(),
          vcard:
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'N:;Shadow;;;\n' +
            'FN:Shadow\n' +
            'ORG:Shadow Garden\n' +
            'TITLE:\n' +
            'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
            'item1.X-ABLabel:Shadow\n' +
            'X-WA-BIZ-DESCRIPTION:Archivo invocado desde el Reino de las Sombras\n' +
            'X-WA-BIZ-NAME:Shadow Garden\n' +
            'END:VCARD'
        }
      }
    }

    // PREPARAR VIDEO
    const media = await generateWAMessageContent({
      video: { url: videoURL },
      caption: 'TRANSMISIÓN COMPLETADA — ARCHIVO EXTRAÍDO DEL PORTAL'
    }, { upload: conn.waUploadToServer })

    // BOTONES + MENSAJE INTERACTIVO
    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: 'ARCHIVO EXTRAÍDO DEL PORTAL DE FACEBOOK\n\n> El Reino Digital ha respondido.' },
            footer: { text: '⚔️ Shadow Garden' },
            header: {
              hasMediaAttachment: true,
              videoMessage: media.videoMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_copy',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Copiar',
                    copy_code: '*Shadow Garden te observa...*'
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Abrir Facebook',
                    url: args[0],
                    merchant_url: args[0]
                  })
                }
              ]
            }
          })
        }
      }
    }, { quoted: header })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await m.react('✔️')

  } catch (e) {
    await m.react('✖️')
    conn.reply(m.chat, `「✦」Error inesperado.\nDetalles: ${e.message}`, m)
  }
}

handler.command = ['facebook', 'fb']
handler.tags = ['descargas']
handler.help = ['facebook', 'fb']

export default handler
