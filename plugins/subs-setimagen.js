import fs from 'fs'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

async function uploadToFreeImageHost(buffer) {
  try {
    const form = new FormData()
    form.append('source', buffer, 'file')
    const res = await axios.post('https://freeimage.host/api/1/upload', form, {
      params: {
        key: '6d207e02198a847aa98d0a2a901485a5'
      },
      headers: form.getHeaders()
    })
    return res.data.image.url
  } catch (err) {
    console.error('Error FreeImageHost:', err?.response?.data || err.message)
    return null
  }
}

const handler = async (m, { conn, command }) => {
  const senderNumber = m.sender.replace(/[^0-9]/g, '')
  const botPath = path.join('./Sessions/SubBot', senderNumber)
  const configPath = path.join(botPath, 'config.json')

  if (!fs.existsSync(botPath)) {
    return m.reply('> ꕤ Este comando es solo para *sockets*.')
  }

  try {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!mime || !/image\/(jpe?g|png|webp)/.test(mime)) {
      return conn.sendMessage(m.chat, {
        text: `❐ Por favor, responde a una imagen válida (JPG, PNG, WEBP) usando *.${command}*`,
      }, { quoted: m })
    }

   
    await conn.sendMessage(m.chat, {
      react: { text: '🕓', key: m.key }
    })

    
    const media = await q.download()
    if (!media) throw new Error('❌ No se pudo descargar la imagen.')

    
    const tempDir = './tmp'
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)
    const { ext } = await fileTypeFromBuffer(media) || { ext: 'png' }
    const tempPath = path.join(tempDir, `banner_${Date.now()}.${ext}`)
    fs.writeFileSync(tempPath, media)

   
    const uploadedUrl = await uploadToFreeImageHost(media)
    if (!uploadedUrl) throw new Error('❒ Error al subir la imagen.')

    
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath))
      : {}
    config.banner = uploadedUrl
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    await conn.sendMessage(m.chat, {
      text: `✩︎ Imagen actualizada correctamente:\n${uploadedUrl}`,
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

    
    fs.unlinkSync(tempPath)

  } catch (err) {
    console.error(err)
    await conn.sendMessage(m.chat, {
      text: '❌ No se pudo subir el banner, inténtalo más tarde.',
    }, { quoted: m })
    await conn.sendMessage(m.chat, {
      react: { text: '✖️', key: m.key }
    })
  }
}

handler.help = ['setimagen']
handler.tags = ['socket']
handler.command = ['setimagen']
export default handler
