import speed from 'performance-now'
import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  let timestamp = speed()
  let userId = m.sender
  let userName = conn.getName(userId)
  let userNumber = userId.split('@')[0]

  // 1. Mensaje rápido de carga
  let { key } = await conn.reply(m.chat, '❐ 𝐂𝐚𝐥𝐜𝐮𝐥𝐚𝐧𝐝𝐨 𝐏𝐢𝐧𝐠... 🚀', m)

  try {
    // 2. Miniatura pequeña para el quoted (URL que pediste)
    const res = await fetch('https://i.ibb.co/ZRLSTYx7/b0243290e236.jpg')
    const thumb = Buffer.from(await res.arrayBuffer())

    // 3. Estructura shadow_xyz para el quoted (citado)
    const shadow_xyz = {
      key: {
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'ShadowCatalogPing',
        participant: '0@s.whatsapp.net'
      },
      message: {
        productMessage: {
          product: {
            productImage: {
              mimetype: 'image/jpeg',
              jpegThumbnail: thumb
            },
            title: '𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 • 𝐏𝐢𝐧𝐠',
            description: 'Shadow team system',
            currencyCode: 'USD',
            priceAmount1000: '0',
            retailerId: 'ShadowCore',
            productImageCount: 1,
            productId: '999999999999999'
          },
          businessOwnerJid: '584242773183@s.whatsapp.net'
        }
      }
    }

    let latency = speed() - timestamp
    let ping = latency.toFixed(0)

    let result = `
✨ *¡𝐏𝐎𝐍𝐆!* ✨

> 🌌 *𝐓𝐢𝐞𝐦𝐩𝐨:* ${ping}𝐦𝐬
> 👤 *𝐔𝐬𝐮𝐚𝐫𝐢𝐨:* ${userName} (@${userNumber})
> 👑 *𝐃𝐮𝐞𝐧̃𝐨𝐬:* 𝐘𝐨𝐬𝐮𝐞 (𝐒𝐡𝐚𝐝𝐨𝐰) & 𝐀𝐝𝐨
> 🏎️ *𝐋𝐢𝐧𝐮𝐱 𝐒𝐩𝐞𝐞𝐝:* 𝐌𝐚́𝐱𝐢𝐦𝐚 𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝 🚀

🖥️ *𝐒𝐭𝐚𝐭𝐮𝐬:* 𝐎𝐧𝐥𝐢𝐧𝐞 
🛰️ *𝐍𝐨𝐝𝐞:* 𝐯𝟐𝟎.𝟏𝟏.𝟎
⚡ *𝐏𝐨𝐰𝐞𝐫:* 𝟏𝟎𝟎% 𝐂𝐚𝐩𝐚𝐜𝐢𝐭𝐲

*જ 𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 𝐈𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 🧪 𖤓*`.trim()

    // 4. Borramos el de carga
    await conn.sendMessage(m.chat, { delete: key })

    // 5. ENVIAMOS EL PRODUCT MESSAGE (Siguiendo tu ejemplo de registro)
    const pingProduct = {
      product: {
        productImage: { url: 'https://files.catbox.moe/yfdd3r.jpg' },
        productId: '999999999999999',
        title: '✨ 𝐏𝐈𝐍𝐆 - 𝐒𝐇𝐀𝐃𝐎𝐖 𝐁𝐎𝐓 ✨',
        description: 'Latencia del sistema',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailerId: 'ShadowCore',
        url: `https://wa.me/584242773183`,
        productImageCount: 1
      },
      businessOwnerJid: '584242773183@s.whatsapp.net',
      caption: result,
      footer: '🌌 Shadow Bot',
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: '𝐒𝐡𝐚𝐝𝐨𝐰 𝐆𝐚𝐫𝐝𝐞𝐧 • 𝐏𝐢𝐧𝐠',
          body: 'Sistema en línea',
          mediaType: 1,
          thumbnailUrl: 'https://i.ibb.co/ZRLSTYx7/b0243290e236.jpg',
          sourceUrl: 'https://wa.me/584242773183'
        }
      }
    }

    await conn.sendMessage(m.chat, pingProduct, { quoted: shadow_xyz })

  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { text: '❌ Error al procesar el ping.' }, { quoted: m })
  }
}

handler.help = ['ping']
handler.tags = ['informacion']
handler.command = ['ping', 'p']

export default handler
