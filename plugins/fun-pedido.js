import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

async function sendCustomPedido(m, conn, texto, cantidad) {
  try {
    const img = 'https://files.catbox.moe/rjgi98.jpg'
    const res = await axios.get(img, { responseType: 'arraybuffer' })
    const imgBuffer = Buffer.from(res.data)

    const orderMessage = {
      orderId: 'FAKE-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: parseInt(cantidad),
      status: 1,
      surface: 1,
      message: texto,
      orderTitle: 'Pedido enviado por catálogo',
      token: null,
      sellerJid: null,
      totalAmount1000: '0',
      totalCurrencyCode: 'GTQ',
      contextInfo: {
        externalAdReply: {
          title: 'WhatsApp Business • Estado',
          body: 'Contacto: Meta AI',
          thumbnailUrl: img,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }

    const msg = generateWAMessageFromContent(m.chat, { orderMessage }, { quoted: m })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  } catch (err) {
    console.error(err)
    m.reply('⚠️ Error enviando el pedido.', m)
  }
}

let handler = async (m, { conn, args }) => {
  const input = args.join(' ')
  if (!input.includes('|')) return m.reply('*ⓘ* Usa el formato: `.pedido mensaje|cantidad`\nEjemplo: `.pedido hola|1370`')

  const [texto, cantidad] = input.split('|')
  if (!texto || !cantidad || isNaN(cantidad)) return m.reply('*ⓘ* Asegúrate de escribir un mensaje y una cantidad válida.\nEjemplo: `.pedido hola|1370`')

  await sendCustomPedido(m, conn, texto.trim(), cantidad.trim())
}

handler.command = ['pedido']
handler.help = ['pedido <mensaje>|<cantidad>']
handler.tags = ['tools']
export default handler
