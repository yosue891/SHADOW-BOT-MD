import fetch from 'node-fetch'
import { format } from 'util'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (m.fromMe) return

  let url = (text || '').trim()
  if (!/^https?:\/\//i.test(url)) {
    return m.reply(`Ingresa una URL válida.\n\nEjemplo: ${usedPrefix + command} https://api.github.com`)
  }

  await m.react('🕒')

  try {
    let res = await fetch(url)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`)
    }

    let contentLength = Number(res.headers.get('content-length') || 0)
    let maxBytes = 100 * 1024 * 1024
    if (contentLength > maxBytes) {
      throw new Error(`El archivo supera el límite permitido (${contentLength} bytes)`)
    }

    let contentType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()
    let arrayBuf = await res.arrayBuffer()
    let buffer = Buffer.from(arrayBuf)

    if (buffer.length > maxBytes) {
      throw new Error(`El archivo supera el límite permitido (${buffer.length} bytes)`)
    }

    if (/text|json|xml|javascript|html/i.test(contentType)) {
      let rawText = buffer.toString('utf-8')
      let outputText = rawText
      try {
        outputText = format(JSON.parse(rawText))
      } catch (e) {
        outputText = rawText
      }

      await m.reply(outputText.slice(0, 65536))
      await m.react('✅')
      return
    }

    let extension = contentType.split('/')[1] || 'bin'
    let fileName = `archivo.${extension}`

    if (/^image\//i.test(contentType)) {
      await conn.sendMessage(m.chat, { image: buffer, mimetype: contentType }, { quoted: m })
    } else if (/^video\//i.test(contentType)) {
      await conn.sendMessage(m.chat, { video: buffer, mimetype: contentType }, { quoted: m })
    } else if (/^audio\//i.test(contentType)) {
      await conn.sendMessage(m.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType, fileName: fileName }, { quoted: m })
    }

    await m.react('✅')
  } catch (e) {
    await m.react('❌')
    let errMsg = e && e.message ? e.message : String(e)
    await conn.reply(m.chat, `Error al obtener el recurso:\n${errMsg}`, m)
  }
}

handler.help = ['get', 'fetch']
handler.tags = ['tools']
handler.command = ['fetch', 'get']

export default handler
