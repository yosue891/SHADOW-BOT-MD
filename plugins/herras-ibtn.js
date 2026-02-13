import baileys from "@whiskeysockets/baileys"
const { proto, generateWAMessageFromContent } = baileys

function onlyDigits(s = "") {
  return String(s).replace(/[^0-9]/g, "")
}
function sanitizePhone(n) {
  return onlyDigits(n)
}
function getJid(m) {
  return m?.chat || m?.key?.remoteJid || m?.key?.participant || m?.sender || null
}

let handler = async (m, { conn }) => {
  const jid = getJid(m)
  if (!jid) throw "No se pudo detectar el chat/jid del mensaje."

  const text = "*[BTNS]* Botones Test"
  const footer = "-----"

  const buttons = [
    {
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "copy",
        copy_code: "Nose"
      })
    },
    {
      name: "cta_catalog",
      buttonParamsJson: JSON.stringify({
        business_phone_number: sanitizePhone("584242773183")
      })
    },
    {
      name: "cta_call",
      buttonParamsJson: JSON.stringify({
        display_text: "call",
        phone_number: sanitizePhone("58")
      })
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "Vercel",
        url: "https://vercel.com",
        merchant_url: "https://vercel.com"
      })
    },
    {
      name: "cta_reminder",
      buttonParamsJson: JSON.stringify({
        display_text: "https://ifconfig.me"
      })
    },
    {
      name: "address_message",
      buttonParamsJson: JSON.stringify({
        display_text: "..."
      })
    },
    {
      name: "send_location",
      buttonParamsJson: JSON.stringify({
        display_text: "..."
      })
    },
    {
      name: "open_webview",
      buttonParamsJson: JSON.stringify({
        title: "API!",
        link: {
          in_app_webview: true,
          url: "https://api-adonix.ultraplus.click"
        }
      })
    },
    {
      name: "cta_cancel_reminder",
      buttonParamsJson: JSON.stringify({
        display_text: "..."
      })
    },
    {
      name: "mpm",
      buttonParamsJson: JSON.stringify({
        product_id: "8816262248471474"
      })
    },
    {
      name: "wa_payment_transaction_details",
      buttonParamsJson: JSON.stringify({
        transaction_id: "12345848"
      })
    },
    {
      name: "automated_greeting_message_view_catalog",
      buttonParamsJson: JSON.stringify({
        business_phone_number: sanitizePhone("62000"),
        catalog_product_id: "12345"
      })
    }
  ]

  const content = {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: { text },
          footer: { text: footer },
          header: {
            title: "",
            subtitle: "",
            hasMediaAttachment: false
          },
          nativeFlowMessage: { buttons }
        })
      }
    }
  }

  const msg = generateWAMessageFromContent(jid, content, {
    userJid: conn.user?.jid,
    quoted: m
  })

  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
}

handler.help = ["ibtn"]
handler.tags = ["main"]
handler.command = ["ibtn"]

export default handler
