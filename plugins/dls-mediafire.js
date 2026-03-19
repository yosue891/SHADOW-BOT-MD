import fetch from 'node-fetch'
import { lookup } from 'mime-types'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return conn.reply(m.chat, '❀ Te faltó el enlace de Mediafire.', m)
  if (!/^https:\/\/www\.mediafire\.com\//i.test(text)) 
    return conn.reply(m.chat, 'ꕥ Enlace inválido.', m)

  try {
    await m.react('🕒')

    const apiURL = `https://apiaxi.i11.eu/down/mediafire?url=${encodeURIComponent(text)}`
    const res = await fetch(apiURL)
    const json = await res.json()

    if (!json.status || !json.result?.url) {
      throw 'ꕥ No se pudo obtener el archivo desde la API.'
    }

    const file = json.result
    const filename = file.filename || 'archivo'
    const filesize = file.filesize || 'desconocido'
    const mimetype = lookup(filename.split('.').pop().toLowerCase()) || 'application/octet-stream'
    const dl_url = file.url

    const caption = `乂 MEDIAFIRE - DESCARGA 乂

✩ Nombre » ${filename}
✩ Peso » ${filesize}
✩ MimeType » ${mimetype}
✩ Enlace » ${text}`

    await conn.sendMessage(
      m.chat,
      { document: { url: dl_url }, fileName: filename, mimetype, caption },
      { quoted: m }
    )

    await m.react('✔️')

  } catch (e) {
    await m.react('✖️')
    return conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e}`,
      m
    )
  }
}

handler.command = ['mf', 'mediafire']
handler.help = ['mediafire']
handler.tags = ['descargas']
handler.group = true

export default handler
