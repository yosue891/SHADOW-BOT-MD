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
    { 
      headers: form.getHeaders(),
      timeout: 40000 // 40 segundos de margen máximo para la subida
    }
  )

  if (!data.startsWith('https://')) throw 'Respuesta inválida del servidor'
  return data
}

let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime) {
    return conn.reply(m.chat, `⚠️ Responde a una imagen, video o audio para subirlo a Catbox.`, m)
  }

  let media
  try {
    // Intentamos descargar con un catch directo para evitar que rompa el proceso del bot si falla
    media = await q.download().catch(() => null)
  } catch (e) {
    media = null
  }

  if (!media || !Buffer.isBuffer(media)) {
    return conn.reply(m.chat, `❌ No se pudo descargar el archivo de WhatsApp. Intenta con un archivo más liviano o reenvíalo.`, m)
  }

  // Límite de seguridad: Evitar procesar archivos de más de 15MB para no saturar el socket
  if (media.length > 15 * 1024 * 1024) {
    return conn.reply(m.chat, `⚠️ El archivo es demasiado grande (Máximo 15MB para evitar caídas de conexión).`, m)
  }

  try {
    let url = await uploadCatbox(media, mime)
    
    let txt = `*UPLOAD COMPLETADO*\n\n` +
              `• Servidor: Catbox\n` +
              `• Tipo: ${mime}\n` +
              `• URL:\n${url}`

    await conn.reply(m.chat, txt, m)
  } catch (error) {
    console.error('Error en Catbox:', error)
    await conn.reply(m.chat, `❌ Ocurrió un error al subir a Catbox.`, m)
  }
}

handler.help = ['catbox']
handler.tags = ['tools']
handler.command = ['catbox', 'upload']

export default handler
