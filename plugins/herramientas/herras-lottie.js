import { generateWAMessageFromContent } from "@whiskeysockets/baileys"

const handler = async (m, { conn }) => {

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/v/t62.15575-24/589127051_1437854134241861_7612400585120949451_n.enc",
        mimetype: "application/was",
        fileSha256: Buffer.from("cAG9zS+n9tEFvR3IzzemKupjdOg8hXso/Mygi++Uicc=", "base64"),
        fileEncSha256: Buffer.from("pWJnX1smuhvMBNElIzwh5fMjxvtAvjKCSnz8TqdUyCk=", "base64"),
        mediaKey: Buffer.from("yq+O6MTmu+EZ9GecYVH8lxeGAs0R2mpkNc9lQThMdZg=", "base64"),
        isAnimated: true,
        isLottie: true,
        height: 64,
        width: 64,
        directPath: "/v/t62.15575-24/589127051_1437854134241861_7612400585120949451_n.enc"
      }
    },
    { userJid: conn.user.id }
  )

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

// 🔥 IMPORTANTE (esto arregla tu error)
handler.command = ['lottie']

export default handler
