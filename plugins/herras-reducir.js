import { Jimp } from 'jimp'
import axios from 'axios'
import FormData from 'form-data'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import * as baileys from '@whiskeysockets/baileys'

const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = baileys

const IMGBB_KEY = '60b7b57c73586b5d915df1c3c378a458'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, `❍ Responde a una imagen/sticker y usa:\n*${usedPrefix}reducir 300×300*`, m)
  }

  let input = text.trim().split(/[x×]/i)
  if (input.length !== 2 || isNaN(input[0]) || isNaN(input[1])) {
    return m.reply(`❌ Formato incorrecto.\nUsa: *${usedPrefix}reducir 300×300*`)
  }

  let width = parseInt(input[0])
  let height = parseInt(input[1])

  // Identificar correctamente si es un mensaje citado o el directo
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/image|sticker/.test(mime)) {
    return conn.reply(m.chat, `❍ Responde a una imagen/sticker para reducirlo.`, m)
  }

  try {
    // DESCARGA CORRECTA USANDO EL MÉTODO NATIVO DE BAILEYS
    let media = await downloadMediaMessage(
      q,
      'buffer',
      {},
      {
        logger: console,
        reconnectMode: 'on'
      }
    )

    if (!media) throw new Error('No se pudo descargar el archivo de WhatsApp.')

    let image = await Jimp.read(media)
    image.resize({ width: width, height: height })
    let buffer = await image.getBufferAsync('image/jpeg')

    let formData = new FormData()
    formData.append('image', buffer, { filename: 'imagen.jpg', contentType: 'image/jpeg' })

    let uploadRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      formData,
      { headers: formData.getHeaders() }
    )

    if (!uploadRes.data?.data?.url) {
      throw new Error('ImgBB no devolvió URL')
    }

    let uploadedUrl = uploadRes.data.data.url

    let mediaMsg = await prepareWAMessageMedia(
      { image: buffer },
      { upload: conn.waUploadToServer }
    )

    const buttons = [{
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "♡ Copiar enlace",
        copy_code: uploadedUrl
      })
    }]

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: `☁️ L I N K:\n${uploadedUrl}`
              }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `Imagen reducida a *${width}×${height}*`
              }),
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: "ⓘ IMAGEN REDUCIDA",
                hasMediaAttachment: true,
                imageMessage: mediaMsg.imageMessage
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons
              })
            })
          }
        }
      },
      { quoted: m }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (e) {
    console.error(e)
    m.reply('⚠️ Error al procesar o subir la imagen.')
  }
}

handler.command = ['reduce', 'reducir']
handler.help = ['reduce', 'reducir']
handler.tags = ['tools']

export default handler
