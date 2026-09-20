import fetch from 'node-fetch'
import axios from 'axios'

function detailOf(e) {
  const st = e?.response?.status
  const body = e?.response?.data
  const msg = typeof body === 'string'
    ? body
    : (body?.error || body?.message || (body ? JSON.stringify(body) : ''))
  const parts = []
  if (st) parts.push(`HTTP ${st}`)
  parts.push(msg ? String(msg).slice(0, 200) : (e?.message || 'Error desconocido'))
  return parts.join(': ')
}

async function fetchSpotify(text) {
  let lastErr

  try {
    const res = await fetch('https://dlapixy.vercel.app/api/downloads/spotify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ url: text }),
    })
    const raw = await res.text()
    let data
    try { data = JSON.parse(raw) } catch (e) {}

    if (data?.ok && Array.isArray(data.files) && data.files.length > 0) {
      const file = data.files[0]
      if (file?.url) {
        return {
          title: data.title,
          thumbnail: data.thumbnail,
          audioUrl: file.url,
          mimeType: file.mimeType || 'audio/mpeg'
        }
      }
    }
  } catch (err) {
    lastErr = err
  }

  const apisRespaldo = [
    {
      url: 'https://api.vreden.web.id/api/spotify',
      param: 'url',
      extractor: (data) => ({
        title: data?.result?.title || data?.result?.metadata?.title,
        thumbnail: data?.result?.cover || data?.result?.metadata?.cover,
        audioUrl: data?.result?.music || data?.result?.downloadUrl,
        mimeType: 'audio/mpeg'
      })
    },
    {
      url: 'https://deliriodevs.com/api/spotify',
      param: 'q',
      extractor: (data) => ({
        title: data?.data?.title || data?.title,
        thumbnail: data?.data?.image || data?.thumbnail,
        audioUrl: data?.data?.url || data?.url || data?.data?.download,
        mimeType: 'audio/mpeg'
      })
    }
  ]

  for (const api of apisRespaldo) {
    try {
      const { data } = await axios.get(api.url, {
        params: { [api.param]: text },
        timeout: 30000
      })
      const extracted = api.extractor(data)
      if (extracted.audioUrl) return extracted
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr || new Error('No se pudo obtener el audio de ninguna API.')
}

async function sendAudio(conn, m, fileUrl, title, mimeType) {
  const mimetype = mimeType || 'audio/mpeg'

  try {
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: fileUrl },
        mimetype,
        ptt: false,
        fileName: `${title || 'audio'}.mp3`
      },
      { quoted: m }
    )
  } catch {
    const r = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    await conn.sendMessage(
      m.chat,
      {
        audio: Buffer.from(r.data),
        mimetype,
        ptt: false,
        fileName: `${title || 'audio'}.mp3`
      },
      { quoted: m }
    )
  }
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `🌕⚔️ Invoca música desde *Spotify*.\n\n` + 
      `Ejemplos:\n> *${usedPrefix + command}* shape of you\n> *${usedPrefix + command}* https://open.spotify.com/track/123456789`,
      m
    )
  }

  await m.react('🕓')

  let stage = 'consulta a la API'

  try {
    const result = await fetchSpotify(text)

    if (!result?.audioUrl) throw new Error('No se encontró un enlace de audio válido')

    const titulo = result.title || 'Sin título'
    const miniatura = result.thumbnail
    const mensaje = `🎵 *Título:* ${titulo}\n🌑 Refinado en las sombras`

    stage = 'envío de la portada'

    if (miniatura) {
      try {
        await conn.sendMessage(
          m.chat,
          { image: { url: miniatura }, caption: mensaje },
          { quoted: m }
        )
      } catch (e) {
        await conn.reply(m.chat, mensaje, m)
      }
    } else {
      await conn.reply(m.chat, mensaje, m)
    }

    stage = 'envío del audio'

    await sendAudio(conn, m, result.audioUrl, titulo, result.mimeType)

    await m.react('✅')

  } catch (error) {
    console.error(`[spotify] ${stage}:`, error?.response?.data || error)
    await m.react('❌')
    conn.reply(
      m.chat,
      `🕷️ El ritual falló... no pude procesar tu solicitud.\n\n🜸 Etapa: ${stage}\n🜸 Detalles: ${detailOf(error)}`,
      m
    )
  }
}

handler.help = ['spotify *<nombre|url>*']
handler.tags = ['descargas']
handler.command = /^(spotify|spdl)$/i
handler.register = true

export default handler
