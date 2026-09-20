import axios from 'axios'

const NYX_IG_URL = 'https://nyxdlapi.vercel.app/api/downloads/instagram'
const NYX_API_KEY = 'nyx_41yhfMefym8Jf09qN400MX9Xopw_ERDN'
const MAX_MEDIA = 10

function safeFromCode(n) {
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}

function decodeEntities(str) {
  const named = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ' }
  return String(str || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (x, n) => named[n.toLowerCase()] ?? x)
}

function cleanText(t) {
  return decodeEntities(t)
    .replace(/^"+|"+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 900)
}

function typeOf(tipo, url) {
  const t = String(tipo || '').toLowerCase()
  if (/^(image|imagen|foto|photo|img)/.test(t)) return 'image'
  if (/^(video|reel)/.test(t)) return 'video'
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(String(url || ''))) return 'image'
  return 'video'
}

function buildMediaList(info) {
  const list = []
  const seen = new Set()

  const push = (url, type) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url) && !seen.has(url)) {
      seen.add(url)
      list.push({ url, type })
    }
  }

  if (Array.isArray(info.media)) {
    for (const x of info.media) {
      push(x?.url, typeOf(x?.tipo || x?.type, x?.url))
    }
  }

  if (!list.length) {
    if (info.download || info.video) push(info.download || info.video, 'video')
    else if (info.image) push(info.image, 'image')
  }

  return list.slice(0, MAX_MEDIA)
}

async function sendMedia(conn, m, media, caption) {
  const key = media.type === 'image' ? 'image' : 'video'
  const extra = key === 'video' ? { mimetype: 'video/mp4' } : {}

  try {
    await conn.sendMessage(
      m.chat,
      { [key]: { url: media.url }, caption, ...extra },
      { quoted: m }
    )
  } catch {
    const r = await axios.get(media.url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 100 * 1024 * 1024,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
      }
    })
    await conn.sendMessage(
      m.chat,
      { [key]: Buffer.from(r.data), caption, ...extra },
      { quoted: m }
    )
  }
}

const handler = async (m, { args, conn, usedPrefix }) => {
  try {
    const link = (args && args[0]) || ''

    if (!link || !/(?:instagram\.com|instagr\.am)\//i.test(link)) {
      return conn.reply(
        m.chat,
        '「✦」Por favor, proporciona un enlace válido de Instagram.',
        m
      )
    }

    if (m.react) await m.react('🕒')

    const res = await axios.get(NYX_IG_URL, {
      params: { url: link, apikey: NYX_API_KEY },
      timeout: 30000
    })

    const json = res.data

    if (!json?.status || !json?.result) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      )
    }

    const info = json.result
    const mediaList = buildMediaList(info)

    if (!mediaList.length) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el contenido del enlace.',
        m
      )
    }

    const title = cleanText(info.title || info.caption)
    const caption = title ? `> ✩ ${title}` : '> ✩ Aqui tienes tu pedido.'

    for (const media of mediaList) {
      await sendMedia(conn, m, media, caption)
    }

    if (m.react) await m.react('✔️')
  } catch (error) {
    if (m.react) await m.react('✖️')
    await conn.reply(m.chat, `Error: ${error.message}`, m)
  }
}

handler.command = ['instagram', 'ig']
handler.tags = ['descargas']
handler.help = ['instagram', 'ig']

export default handler
