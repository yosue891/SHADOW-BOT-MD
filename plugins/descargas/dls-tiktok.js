import fetch from 'node-fetch'
import { generateWAMessageFromContent, generateWAMessageContent, proto } from '@whiskeysockets/baileys'

var handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `🎃 [ 🕸️ ] Has olvidado el enlace de TikTok... ¿Acaso temes revelar el portal?\n\n[ 🦇 ] Ejemplo: ${usedPrefix + command} https://vm.tiktok.com/ZMkcmTCa6/`
    )
  }

  if (!args[0].match(/(https?:\/\/)?(www\.)?(vm\.|vt\.)?tiktok\.com\//)) {
    return m.reply(
      `🎃 [ ⚠️ ] Ese enlace no pertenece a TikTok. No intentes engañar a la sombra.`
    )
  }

  try {
    await m.react('🎃')
    await conn.reply(
      m.chat,
      '🎃 [ ⏳ ] Invocando el video en las sombras de Halloween... Preparando transferencia dimensional... 🦇',
      m
    )

    const tiktokData = await tiktokdl(args[0])

    if (!tiktokData || !tiktokData.data) {
      return m.reply(
        '🎃 [ 🕳️ ] La sombra no pudo extraer el video. El vínculo está maldito.'
      )
    }

    const videoURL = tiktokData.data.play
    const shadowInfo = `🎃📜 Fragmento extraído:\n> ${tiktokData.data.title || 'Sin título'}`

    const businessHeader = {
      key: { remoteJid: m.chat, participant: '0@s.whatsapp.net', fromMe: false, id: 'ShadowHeader' },
      message: {
        locationMessage: {
          name: '🎃 TikTok • Halloween 🦇',
          jpegThumbnail: Buffer.from(await (await fetch('https://files.catbox.moe/dsgmid.jpg')).arrayBuffer()),
          vcard:
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'N:;Shadow;;;\n' +
            'FN:Shadow\n' +
            'ORG:Shadow Garden Halloween\n' +
            'TITLE:\n' +
            'item1.TEL;waid=5804242773183:+58 0424-2773183\n' +
            'item1.X-ABLabel:Shadow\n' +
            'X-WA-BIZ-DESCRIPTION:Archivo invocado desde el Aquelarre de las Sombras\n' +
            'X-WA-BIZ-NAME:Shadow Garden\n' +
            'END:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    const media = await generateWAMessageContent({
      video: { url: videoURL },
      caption: '🎃🦇 TRANSMISIÓN DE ULTRATUMBA COMPLETADA 🦇🎃\n\n' + shadowInfo
    }, { upload: conn.waUploadToServer, jid: m.chat })

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: { text: 'TRANSMISIÓN COMPLETADA - ARCHIVO DE LAS SOMBRAS\n\n' + shadowInfo },
            footer: { text: '⚔️ Shadow Garden' },
            header: {
              hasMediaAttachment: true,
              videoMessage: media.videoMessage
            },
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              messageParamsJson: '',
              buttons: [
                {
                  name: 'cta_copy',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Copiar',
                    copy_code: '*I LOVE yosue Shadow-Bot uwu*'
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Abrir TikTok',
                    url: args[0],
                    merchant_url: args[0]
                  })
                }
              ]
            }),
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: false
            }
          })
        }
      }
    }, {
      quoted: businessHeader,
      userJid: conn.user?.jid || conn.user?.id,
      upload: conn.waUploadToServer
    })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  } catch (error1) {
    await conn.reply(
      m.chat,
      `[ 🩸 ] Error detectado: ${error1}\nLas sombras no perdonan los errores...`,
      m
    )
  }
}

handler.help = ['tiktok']
handler.tags = ['descargas']
handler.command = ['tt', 'tiktok']

export default handler

async function tiktokdl(url) {
  const tikwm = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
  const response = await (await fetch(tikwm, { signal: AbortSignal.timeout(20000) })).json()
  return response
      }
