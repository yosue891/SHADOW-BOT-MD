import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
  // texto que quieres copiar al portapapeles
  let copyText = "Shadow-BOT-MD Serial/Código de ejemplo"

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
          },
          header: {
            title: "🎄 Shadow-BOT-MD Panel",
            hasMediaAttachment: false,
          },
          body: {
            // aquí mantengo el texto "cargado" como lo tenías
            text: "i ᡃ⃝ᡃ⃝ᡃ⃝...".repeat(5000) + " ...".repeat(5000),
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Canal Oficial 💚",
                  url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O",
                }),
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copiar Código",
                  id: "shadow-copy",
                  copy_code: copyText
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
