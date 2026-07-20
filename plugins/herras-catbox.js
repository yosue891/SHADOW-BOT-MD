import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

async function uploadToCatbox(buffer) {
  const type = await fileTypeFromBuffer(buffer)
  const ext = type ? type.ext : 'bin'
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', buffer, `file.${ext}`)
  
  const response = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders()
  })
  return response.data
}

async function uploadToTmpfiles(buffer) {
  const type = await fileTypeFromBuffer(buffer)
  const ext = type ? type.ext : 'bin'
  const form = new FormData()
  form.append('file', buffer, `file.${ext}`)

  const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
    headers: form.getHeaders()
  })
  if (response.data && response.data.status === 'success') {
    return response.data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/')
  }
  throw new Error('Tmpfiles failed')
}

async function uploadToQuaxg(buffer) {
  const type = await fileTypeFromBuffer(buffer)
  const ext = type ? type.ext : 'bin'
  const form = new FormData()
  form.append('file', buffer, `file.${ext}`)

  const response = await axios.post('https://upload.quaxg.xyz/upload', form, {
    headers: form.getHeaders()
  })
  if (response.data && response.data.url) {
    return response.data.url
  }
  throw new Error('Quaxg failed')
}

let handler = async (m, { conn, command, usedPrefix }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime.includes('image') && !mime.includes('video') && !mime.includes('gif')) {
    return conn.reply(m.chat, `*✘ Responde a una imagen, video o GIF* usando el comando *${usedPrefix}${command}*`, m)
  }

  await conn.reply(m.chat, '✦ Procesando y subiendo archivo...', m)

  try {
    let media = await q.download()
    let link = ''

    try {
      link = await uploadToCatbox(media)
    } catch {
      try {
        link = await uploadToTmpfiles(media)
      } catch {
        link = await uploadToQuaxg(media)
      }
    }

    return conn.reply(m.chat, `*✦ ¡Enlace generado con éxito!* \n\n${link}`, m)

  } catch (error) {
    console.error(error)
    return conn.reply(m.chat, '✘ Todos los servidores de subida fallaron.', m)
  }
}

handler.help = ['catbox']
handler.tags = ['tools']
handler.command = ['catbox']
handler.register = true

export default handler
