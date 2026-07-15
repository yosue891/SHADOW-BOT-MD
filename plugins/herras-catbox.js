import axios from 'axios'
import FormData from 'form-data'

function randomName(ext = 'bin') {
  return `${Math.random().toString(36).slice(2, 8)}.${ext}`
}

async function uploadCatbox(buffer, mime) {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('userhash', 'c9bc208e83a7dbc7c7cc68aff')
  form.append('fileToUpload', buffer, {
    filename: randomName(mime.split('/')[1]),
    contentType: mime
  })

  const { data } = await axios.post(
    'https://catbox.moe/user/api.php',
    form,
    { headers: form.getHeaders() }
  )

  if (!data.startsWith('https://')) throw 'Error en Catbox'
  return data
}

let handler = async (m, { conn }) => {
  let q = m.quoted || m
  let mime = (q.msg || q).mimetype || ''

  if (!mime) {
    return conn.reply(m.chat, `Responde a una imagen, video o documento para subirlo a Catbox.`, m)
  }

  let media = await q.download()
  if (!media) throw 'No pude descargar el archivo de los servidores de WhatsApp.'

  try {
    let url = await uploadCatbox(media, mime)
    
    let txt = `*UPLOAD COMPLETADO*\n\n` +
              `• Servidor: Catbox\n` +
              `• Tipo: ${mime}\n` +
              `• URL:\n${url}`

    await conn.reply(m.chat, txt, m)
  } catch (error) {
    await conn.reply(m.chat, `Ocurrió un error al intentar subir a Catbox: ${error}`, m)
  }
}

handler.help = ['catbox']
handler.tags = ['tools']
handler.command = ['catbox', 'upload']

export default handler
