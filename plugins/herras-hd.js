import fetch from 'node-fetch'
import FormData from 'form-data'

async function uploadImage(buffer) {
  const form = new FormData()
  form.append('fileToUpload', buffer, 'image.jpg')
  form.append('reqtype', 'fileupload')

  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Error al subir la imagen')
  return await res.text()
}

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    await m.react('⏳')

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!mime) {
      return conn.sendMessage(m.chat, {
        text: `❇️ Por favor, envía una imagen o responde a una imagen usando *${usedPrefix + command}*`
      }, { quoted: m })
    }

    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
      return conn.sendMessage(m.chat, {
        text: `⚠️ El formato (${mime}) no es compatible, usa JPG, PNG o WEBP.`
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      text: `⏳ Mejorando tu imagen, espera...`
    }, { quoted: m })

    let img = await q.download?.()
    if (!img) throw new Error('No pude descargar la imagen.')

    let uploadedUrl = await uploadImage(img)

    const api = `https://api-adonix.ultraplus.click/canvas/hd?apikey=SHADOWBOTMDKEY&url=${encodeURIComponent(uploadedUrl)}`
    const res = await fetch(api)
    if (!res.ok) throw new Error(`Error en la API: ${res.statusText}`)
    const data = await res.json()

    if (!data.status || !data.url) throw new Error('No se pudo mejorar la imagen.')

    const improvedRes = await fetch(data.url)
    const buffer = await improvedRes.buffer()

    await conn.sendMessage(m.chat, {
      image: buffer,
      caption: '✅ *Imagen mejorada con éxito*'
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.error(e)
    await m.react('✖️')
    await conn.sendMessage(m.chat, {
      text: '❌ Error al mejorar la imagen, inténtalo más tarde.',
      ...global.rcanal
    }, { quoted: m })
  }
}

handler.help = ['hd']
handler.tags = ['tools']
handler.command = ['remini', 'hd', 'enhance']

export default handler
