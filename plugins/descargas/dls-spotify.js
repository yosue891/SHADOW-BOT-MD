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
    },
    {
      url: 'https://dlapixy.vercel.app/api/downloads/spotify',
      param: 'url',
      extractor: (data) => {
        const info = data?.data || data
        const files = Array.isArray(info?.files) ? info.files : []
        const audioFile = files.find(f => f?.kind === 'audio' && f?.url) || files.find(f => f?.url)
        return {
          title: info?.title,
          thumbnail: info?.thumbnail,
          audioUrl: audioFile?.url || info?.downloadUrl || info?.url
        }
      }
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

      lastErr = new Error('Respuesta inválida de la API')
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr
}

async function sendAudio(conn, m, fileUrl) {
  const mimetype = 'audio/mpeg'

  try {
    await conn.sendMessage(
      m.chat,
      { audio: { url: fileUrl }, mimetype },
      { quoted: m }
    )
  } catch {
    const r = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxContentLength: 100 * 1024 * 1024
    })
    await conn.sendMessage(
      m.chat,
      { audio: Buffer.from(r.data), mimetype },
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
        console.error('Error enviando la portada:', e)
        await conn.reply(m.chat, mensaje, m)
      }
    } else {
      await conn.reply(m.chat, mensaje, m)
    }

    stage = 'envío del audio'

    await sendAudio(conn, m, result.audioUrl)

    await m.react('✅')

  } catch (error) {
    console.error(`[spotify] ${stage}:`, error?.response?.status, error?.response?.data || error)
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
