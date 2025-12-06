import { createHash } from 'crypto'
import fetch from 'node-fetch'
import FormData from 'form-data'
import axios from 'axios'

const handler = async (m, { conn, command, usedPrefix, text }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    switch (command) {
      case 'tourl': {
        if (!mime) return conn.reply(m.chat, `💫 Por favor responde a una Imagen, Vídeo o Audio...`, m)
        await m.react('🕒')

        const media = await q.download()
        const isMedia = /image\/(png|jpe?g|gif)|video\/(mp4|webm)|audio\/(mp3|mpeg|wav|ogg|m4a)/.test(mime)

        if (!isMedia) return conn.reply(m.chat, '⚠️ Tipo de archivo no soportado.', m)

        const link = await uploadFileHostrta(media, mime, q.filename || `file`)

        const txt = `乂  *L I N K - E N L A C E* 乂\n\n*» Enlace* : ${link}\n*» Tamaño* : ${formatBytes(media.length)}\n*» Expiración* : No expira\n\n> *${dev || 'Michi-WaBot'}*`

        await conn.sendFile(m.chat, media, q.filename || 'file', txt, m)
        await m.react('✔️')
        break
      }
    }
  } catch (error) {
    await m.react('✖️')
    await conn.reply(m.chat, `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${error.message}`, m)
  }
}

handler.help = ['tourl']
handler.tags = ['tools']
handler.command = ['tourl']

export default handler

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}

async function uploadFileHostrta(buffer, mime, filename) {
  const form = new FormData()
  const ext = mime.split('/')[1] || filename.split('.').pop() || 'bin'
  form.append('file', buffer, { filename: `${filename}.${ext}`, contentType: mime })

  const uploadResponse = await axios.post('https://files.hostrta.win/upload', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Michi-WaBot'
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })

  if (uploadResponse.data?.url) {
    return uploadResponse.data.url
  } else {
    throw new Error('CDN did not return a URL')
  }
                                                                                                      }
