const handler = async (m, { conn, text }) => {
  const user = global.db.data.users[m.sender]

  user.afk = +new Date
  user.afkReason = text || ''

  const thumb = await (await fetch("https://files.catbox.moe/e6br3k.jpg")).buffer()

  const shadow_xyz = {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast"
    },
    message: {
      viewOnceMessage: {
        message: {
          productMessage: {
            product: {
              productImage: {
                mimetype: "image/jpeg",
                jpegThumbnail: thumb
              },
              title: "WhatsApp Business • Estado",
              description: "Shadow System",
              currencyCode: "USD",
              priceAmount1000: 5000,
              retailerId: "ShadowCore",
              productImageCount: 1
            },
            businessOwnerJid: "51900922660@s.whatsapp.net"
          }
        }
      }
    }
  }

  await conn.sendMessage(
    m.chat,
    { 
      text: `🌌 *Discípulo de las Sombras* 🎄\nHas entrado en estado AFK.\n○ Motivo » *${text || 'sin especificar'}*`
    },
    { quoted: shadow_xyz }
  )
}

handler.help = ['afk [razón]']
handler.tags = ['tools']
handler.command = ['afk']

export default handler
