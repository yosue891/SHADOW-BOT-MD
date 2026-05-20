import fetch from 'node-fetch'

const handler = async (m, { conn, text }) => {
  const user = global.db.data.users[m.sender]

  user.afk = +new Date()
  user.afkReason = text || ''

  let thumb = null
  try {
    thumb = await (await fetch("https://i.postimg.cc/rFfVL8Ps/image.jpg")).buffer()
  } catch {
    thumb = null
  }

  const shadow_xyz = {
    key: {
      remoteJid: "status@broadcast",
      fromMe: false,
      id: "ShadowCatalog",
      participant: "0@s.whatsapp.net"
    },
    message: {
      productMessage: {
        product: {
          productImage: thumb
            ? {
                mimetype: "image/jpeg",
                jpegThumbnail: thumb
              }
            : undefined,
          title: "WhatsApp Business • Estado",
          description: "Shadow team",
          currencyCode: "USD",
          priceAmount1000: '0',
          retailerId: "ShadowCore",
          productImageCount: 1
        },
        businessOwnerJid: "584242773183@s.whatsapp.net"
      }
    }
  }

  await conn.sendMessage(
    m.chat,
    {
      text:
        `🌌 *Discípulo de las Sombras*\n` +
        `Has entrado en estado AFK.\n` +
        `○ Motivo » *${text || 'sin especificar'}*`
    },
    { quoted: shadow_xyz }
  )
}

handler.help = ['afk [razón]']
handler.tags = ['tools']
handler.command = ['afk']

export default handler
