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

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 60000
  })
  return Buffer.from(res.data)
}

async function fetchSpotify(text) {
  let lastErr

  const apis = [
    {
      url: 'https://api.vreden.web.id/api/spotify',
      param: 'url',
      extractor: (data) => ({
        title: data?.result?.title || data?.result?.metadata?.title,
        thumbnail: data?.result?.cover || data?.result?.metadata?.cover,
        audioUrl: data?.result?.music || data?.result?.downloadUrl
      })
    },
    {
      url: 'https://deliriodevs.com/api/spotify',
      param: 'q',
      extractor: (data) => ({
        title: data?.data?.title || data?.title,
        thumbnail: data?.data?.image || data?.thumbnail,
        audioUrl: data?.data?.url || data?.url || data?.data?.download
      })
    }
  ]

  for (const api of apis) {
    try {
      const { data } = await axios.get(api.url, {
        params: { [api.param]: text },
        timeout: 30000
      })

      const extracted = api.extractor(data)

      if (extracted.audioUrl) {
        return extracted
      }
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr || new Error('Ninguna API de Spotify respondió con un enlace válido.')
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
        const imgBuffer = await getBuffer(miniatura)
        await conn.sendMessage(m.chat, { image: imgBuffer, caption: mensaje }, { quoted: m })
      } catch (e) {
        await conn.reply(m.chat, mensaje, m)
      }
    } else {
      await conn.reply(m.chat, mensaje, m)
    }

    stage = 'envío del audio'

    const audioBuffer = await getBuffer(result.audioUrl)
    await conn.sendMessage(
      m.chat,
      { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false },
      { quoted: m }
    )

    await m.react('✅')

  } catch (error) {
    console.error(`[SPOTIFY ERROR] Ocurrió en etapa "${stage}":`, error)
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
