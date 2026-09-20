import axios from 'axios'
import * as cheerio from 'cheerio'

export const MEDIAFIRE_URL_RE = /^https?:\/\/(www\.)?mediafire\.com\//i

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.mediafire.com/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
}

const EXT_MAP = {
  jpg:  { mime: 'image/jpeg', send: 'image' },
  jpeg: { mime: 'image/jpeg', send: 'image' },
  png:  { mime: 'image/png', send: 'image' },
  gif:  { mime: 'image/gif', send: 'image' },
  webp: { mime: 'image/webp', send: 'image' },
  mp4:  { mime: 'video/mp4', send: 'video' },
  mkv:  { mime: 'video/x-matroska', send: 'video' },
  mov:  { mime: 'video/quicktime',  send: 'video' },
  avi:  { mime: 'video/x-msvideo',  send: 'video' },
  mp3:  { mime: 'audio/mpeg', send: 'audio' },
  ogg:  { mime: 'audio/ogg', send: 'audio' },
  wav:  { mime: 'audio/wav', send: 'audio' },
  m4a:  { mime: 'audio/mp4', send: 'audio' },
  apk:  { mime: 'application/vnd.android.package-archive', send: 'document' },
  pdf:  { mime: 'application/pdf', send: 'document' },
  zip:  { mime: 'application/zip', send: 'document' },
  rar:  { mime: 'application/x-rar-compressed', send: 'document' },
  '7z': { mime: 'application/x-7z-compressed', send: 'document' },
  exe:  { mime: 'application/x-msdownload', send: 'document' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', send: 'document' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', send: 'document' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', send: 'document' },
  txt:  { mime: 'text/plain', send: 'document' },
  json: { mime: 'application/json', send: 'document' },
}

function getExtInfo(filename) {
  const ext = (filename?.split('.').pop() || '').toLowerCase()
  return { ext, ...(EXT_MAP[ext] || { mime: 'application/octet-stream', send: 'document' }) }
}

function cleanFilename(raw) {
  if (!raw) return null
  let name = raw.replace(/\s+/g, ' ').trim()

  const mid = Math.floor(name.length / 2)
  if (name.slice(0, mid) === name.slice(mid)) return name.slice(0, mid)

  const extMatch = name.match(/^(.+\.\w+)\1$/)
  if (extMatch) return extMatch[1]

  const parts = name.split(/\s+/)
  if (parts.length === 2 && parts[0] === parts[1]) return parts[0]

  return name
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return conn.reply(m.chat, '❀ Te faltó el enlace de Mediafire.', m)
  if (!MEDIAFIRE_URL_RE.test(text))
    return conn.reply(m.chat, 'ꕥ Enlace inválido.', m)

  try {
    await m.react('🕒')

    const instance = axios.create({ maxRedirects: 8, timeout: 15000, headers })
    const res = await instance.get(text)

    if (res.status !== 200) throw 'ꕥ HTTP ' + res.status + ' — página no accesible'

    const $ = cheerio.load(res.data)

    if ($('.g-recaptcha').length || $('body').text().includes('Verify you are not a robot')) {
      throw 'ꕥ Se requiere verificación humana (captcha) en MediaFire.'
    }

    let dl_url =
      $('#downloadButton').attr('href') ||
      $('a#download_link').attr('href') ||
      $('a[href*="/download/"]').attr('href') ||
      $('a[href*="dl="]').first().attr('href') || null

    if (dl_url && !dl_url.startsWith('http')) {
      dl_url = new URL(dl_url, 'https://www.mediafire.com/').href
    }
    if (!dl_url) throw 'ꕥ No se encontró el enlace de descarga directa.'

    const rawName = $('.filename').text().trim() || $('.file-name').text().trim() || $('meta[property="og:title"]').attr('content') || null
    const filename = cleanFilename(rawName) || `archivo_${Date.now()}`

    const { mime } = getExtInfo(filename)

    const sizeText = $('.file-size, .dl-btn-label, .details li').text()
    const sizeMatch = sizeText.match(/\(([^)]+)\)|\s*(\d+(?:\.\d+)?\s*(?:MB|GB|KB|bytes?))/i)
    const filesize = sizeMatch ? (sizeMatch[1] || sizeMatch[2] || 'desconocido').trim() : 'desconocido'

    const caption = `乂 MEDIAFIRE - DESCARGA 乂

✩ Nombre » ${filename}
✩ Peso » ${filesize}
✩ MimeType » ${mime}
✩ Enlace » ${text}`

    await conn.sendMessage(
      m.chat,
      {
        document: { url: dl_url },
        mimetype: mime,
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
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message || e}`,
      m
    )
  }
}

handler.command = ['mf', 'mediafire']
handler.help = ['mediafire']
handler.tags = ['descargas']
handler.group = true

export default handler
