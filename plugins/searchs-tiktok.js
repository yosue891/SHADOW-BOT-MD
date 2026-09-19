import axios from 'axios'

const NYX_BASE = 'https://nyxdlapi.vercel.app'
const NYX_TT_URL = `${NYX_BASE}/api/downloads/tiktok`
const NYX_API_KEY = 'nyx_vDSYgjTlKOOLhz-_XmojwHjvH1_hp5c2'

const handler = async (m, { conn, text, usedPrefix }) => {
  const url = (text || '').trim().split(/\s+/)[0]

  if (!url || !url.includes('tiktok.com')) {
    return conn.reply(
      m.chat,
      `✐ Ingresa un enlace válido de TikTok.\n\nEjemplo: *${usedPrefix}tiktok* https://vt.tiktok.com/...`,
      m
    )
  }

  async function getVideo(u) {
    if (!u.startsWith(NYX_BASE)) return { url: u }

    const withKey = u.includes('apikey=') ? u : `${u}${u.includes('?') ? '&' : '?'}apikey=${NYX_API_KEY}`
    try {
      const r = await axios.get(withKey, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 100 * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
          'x-api-key': NYX_API_KEY,
          'apikey': NYX_API_KEY
        }
      })
      return Buffer.from(r.data)
    } catch (err) {
      let direct
      try {
        const token = new URL(u).searchParams.get('token')
        const decoded = token ? Buffer.from(token, 'base64').toString('utf8') : ''
        if (/^https?:\/\//i.test(decoded)) direct = decoded
      } catch {}
      if (!direct) throw err
      return { url: direct }
    }
  }

  try {
    if (m.react) await m.react('🕒')

    const res = await axios.get(NYX_TT_URL, {
      params: { url, apikey: NYX_API_KEY },
      timeout: 30000,
      headers: {
        'x-api-key': NYX_API_KEY,
        'apikey': NYX_API_KEY
      }
    })

    const json = res.data
    if (!json?.status) {
      throw new Error(json?.message || 'La API no devolvió un resultado válido.')
    }

    const result = json?.result

    let videoUrl = result?.downloadNoWatermark || result?.download

    if (!result || !videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se pudo obtener el video. Verifica que el enlace sea público.', m)
    }

    if (!/^https?:\/\//i.test(videoUrl)) videoUrl = `${NYX_BASE}${videoUrl}`

    const caption = `✐ Título » ${result.title || 'Sin descripción'}
ⴵ Autor » ${result.author || result.username || 'Desconocido'}
❒ Música » ${result.musicTitle || 'N/A'}${result.musicArtist ? ` - ${result.musicArtist}` : ''}
✧ API » NyxDLaPI`

    const video = await getVideo(videoUrl)

    await conn.sendMessage(
      m.chat,
      { video, caption },
      { quoted: m }
    )

    if (m.react) await m.react('✔️')
  } catch (e) {
    if (m.react) await m.react('✖️')
    const failedUrl = String(e.config?.url || e.response?.config?.url || '').replace(/apikey=[^&]+/gi, 'apikey=***')
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}${failedUrl ? `\n🜸 URL: ${failedUrl}` : ''}`,
      m
    )
  }
}

handler.help = ['tiktok <link>', 'tt <link>']
handler.tags = ['downloader']
handler.command = ['tiktok', 'tt']

export default handler
