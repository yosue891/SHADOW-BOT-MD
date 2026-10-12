import fetch from 'node-fetch'
import { format } from 'util'

let handler = async (m, { conn, usedPrefix, text }) => {
  if (m.fromMe) return
  if (!/^https?:\/\//.test(text)) 
    return m.reply(`🎃🦇 *Discípulo de las Sombras*, entrega la *URL* para invocar su contenido en la Noche de Brujas. 🕯️\n\n> 🕸️ *Ejemplo:* ${usedPrefix}get https://api.github.com`)

  let url = text
  await m.react('🎃')

  try {
    let res = await fetch(url)

    if (res.headers.get('content-length') > 100 * 1024 * 1024 * 1024) {
      throw `📦 El archivo en la cripta es demasiado grande (${res.headers.get('content-length')})`
    }

    if (!/text|json/.test(res.headers.get('content-type'))) {
      await m.react('🦇')
      return conn.sendFile(m.chat, url, 'shadow_file', `🎃 *Archivo invocado desde las Sombras de Halloween* 🦇`, m)
    }

    let txt = await res.buffer()
    try {
      txt = format(JSON.parse(txt + ''))
    } catch (e) {
      txt = txt + ''
    } finally {
      m.reply(`🎃 *Grimorio de las Sombras – Edición Halloween* 🦇\n\n${txt.slice(0, 65536)}`)
      await m.react('🦇')
    }

  } catch (e) {
    await m.react('✖️')
    conn.reply(m.chat, `🎃⚠️ El ritual de invocación falló en las sombras...\n> Usa *${usedPrefix}report* para informarlo a la corte.\n\n🦇 ${e.message}`, m)
  }
}

handler.help = ['get']
handler.tags = ['tools']
handler.command = ['fetch', 'get']

export default handler
