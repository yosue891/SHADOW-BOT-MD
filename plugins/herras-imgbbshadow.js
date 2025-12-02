import { fileTypeFromBuffer } from 'file-type'
import fetch from 'node-fetch'
import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

async function sendCustomPedido(m, conn, texto) {
  try {
    const img = 'https://files.catbox.moe/deo9r9.jpg'
    const res = await axios.get(img, { responseType: 'arraybuffer' })
    const imgBuffer = Buffer.from(res.data)

    const orderMessage = {
      orderId: 'FAKE-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: 1,
      status: 1,
      surface: 1,
      message: texto,
      orderTitle: '🌑 Shadow - Catálogo 🎄',
      token: null,
      sellerJid: null,
      totalAmount1000: '0',
      totalCurrencyCode: 'VES',
      contextInfo: {
        externalAdReply: {
          title: "Menú Shadow 🎄",
          body: "Comando para imágenes",
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
    m.reply('⚠️ Error enviando el catálogo.', m)
  }
}

const handler = async (m, { conn, text, command }) => {
  const ImgBB_API_Key = '60b7b57c73586b5d915df1c3c378a458' // 🔑 API Key actual
  const ImgBB_API_Url = `https://api.imgbb.com/1/upload?key=${ImgBB_API_Key}`
    
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || q.mediaType || ''
    
  if (!/image/g.test(mime)) {
    return sendCustomPedido(
      m,
      conn,
      `🌑 *Menú Shadow* 🌑\n\n🎄 Recuerden que este poder es para subir imágenes a las Sombras 🎄\n> Att: Shadow\n\n🚩 Adjunta o cita una *imagen* para invocar la subida.`
    )
  }

  await m.react("⏳")

  try {
    const media = await q.download()
    const fileBase64 = media.toString('base64')

    const formData = new URLSearchParams()
    formData.append('image', fileBase64)
        
    const response = await fetch(ImgBB_API_Url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const data = await response.json()

    if (data.status === 200 && data.success) {
      const result = data.data
            
      const replyText = 
`*— 🌑 Subida Exitosa en las Sombras —*

🎄 *URL:* ${result.url}
🎁 *Tipo:* ${result.mime}
✨ *Tamaño:* ${(result.size / 1024).toFixed(2)} KB
⛄ *Expiración:* ${result.expiration ? `${result.expiration} s` : 'Nunca'}

> Att: Shadow 🎄`

      return sendCustomPedido(m, conn, replyText)
    } else {
      throw new Error(`❌ Las Sombras fallaron al subir la imagen: ${data.error ? data.error.message : 'Error desconocido en la respuesta.'}`)
    }

  } catch (error) {
    console.error("Error en imgbb handler:", error)
    await m.reply(`⚠️ La oscuridad encontró un error al procesar o subir la imagen:\n${error.message}`)
    await m.react("❌")
  }
}

handler.help = ['imgbbshadow']
handler.tags = ['tools']
handler.command = ['imgbbshadow', 'uploadshadow']
export default handler
