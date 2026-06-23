import fetch from 'node-fetch'
import { lookup } from 'mime-types'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return conn.reply(m.chat, '❀ Te faltó el enlace de Mediafire.', m)
  if (!/^https:\/\/www\.mediafire\.com\//i.test(text))
    return conn.reply(m.chat, 'ꕥ Enlace inválido.', m)

  try {
    await m.react('🕒')

    const apiURL = `https://yosoyyo-api-ofc.onrender.com/api/mediafire?url=${encodeURIComponent(text)}&apiKey=yosoyyo_sk_2nbk5m69`
    const res = await fetch(apiURL)
    const json = await res.json()

    if (!json || !json.result) {
      throw 'ꕥ La API no devolvió un resultado válido. Verifica tu enlace o la apiKey.'
    }

    const file = json.result
    const filename = file.title || 'archivo_desconocido'
    const filesize = file.size || 'desconocido'
    const dl_url = file.link

    if (!dl_url) {
      throw 'ꕥ No se encontró el enlace de descarga directa en el resultado de la API.'
    }

    const fileExtension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
    const mimetype = lookup(fileExtension) || 'application/octet-stream'

    const caption = `乂 MEDIAFIRE - DESCARGA 乂

✩ Nombre » ${filename}
✩ Peso » ${filesize}
✩ MimeType » ${mimetype}
✩ Enlace » ${text}`

    await conn.sendMessage(
      m.chat,
      {
        document: { url: dl_url },
        mimetype,
        fileName: filename,
        caption
      },
      { quoted: m }
    )

    await m.react('✔️')

  } catch (e) {
    await m.react('✖️')
    return conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\nError: ${e.message || e}`,
      m
    )
  }
}

handler.command = ['mf', 'mediafire']
handler.help = ['mediafire']
handler.tags = ['descargas']
handler.group = true

export default handler
