import axios from 'axios'

const DLAPIXY_SPOTIFY = 'https://dlapixy.vercel.app/api/downloads/spotify'
const RETRY_DELAY = 1500

const sleep = ms => new Promise(r => setTimeout(r, ms))

function describeBody(data) {
  if (data == null || data === '') return 'sin respuesta'
  if (typeof data === 'string') return data.replace(/\s+/g, ' ').slice(0, 150)
  return String(data.error || data.message || JSON.stringify(data)).slice(0, 150)
}

function pickFile(data) {
  const files = Array.isArray(data?.files) ? data.files : []
  return files.find(f => f?.kind === 'audio' && f?.url) || files.find(f => f?.url) || null
}

function normalizeQuality(q) {
  if (!q) return '320kbps'
  return /^\d+$/.test(String(q)) ? `${q}kbps` : String(q)
}

function toResult(data, file) {
  return {
    title: data.title,
    durationSeconds: data.durationSeconds,
    quality: normalizeQuality(file.quality),
    thumbnail: data.thumbnail,
    downloadUrl: file.url,
    mimeType: file.mimeType || 'audio/mpeg'
  }
}

async function fetchDlapixy(text) {
  const errors = []
  const headers = { 'content-type': 'application/json', accept: 'application/json' }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(
        DLAPIXY_SPOTIFY,
        { url: text },
        { headers, timeout: 30000, validateStatus: () => true }
      )
      const file = pickFile(res.data)
      if (res.data?.ok && file) return toResult(res.data, file)

      errors.push(`POST HTTP ${res.status}: ${describeBody(res.data)}`)
      if ([400, 401, 403, 404, 405, 422].includes(res.status)) break
    } catch (err) {
      errors.push(`POST ${err.message}`)
    }
    if (attempt < 3) await sleep(RETRY_DELAY)
  }

  try {
    const res = await axios.get(DLAPIXY_SPOTIFY, {
      params: { url: text },
      headers: { accept: 'application/json' },
      timeout: 30000,
      validateStatus: () => true
    })
    const file = pickFile(res.data)
    if (res.data?.ok && file) return toResult(res.data, file)

    errors.push(`GET HTTP ${res.status}: ${describeBody(res.data)}`)
  } catch (err) {
    errors.push(`GET ${err.message}`)
  }

  const summary = [...new Set([errors[0], errors[errors.length - 1]])].join(' | ')
  throw new Error(`dlapixy → ${summary}`)
}

const apisRespaldo = [
  {
    url: 'https://api.vreden.web.id/api/spotify',
    param: 'url',
    extractor: (data) => ({
      title: data?.result?.title || data?.result?.metadata?.title,
      durationSeconds: null,
      quality: '320kbps',
      thumbnail: data?.result?.cover || data?.result?.metadata?.cover,
      downloadUrl: data?.result?.music || data?.result?.downloadUrl,
      mimeType: 'audio/mpeg'
    })
  },
  {
    url: 'https://deliriodevs.com/api/spotify',
    param: 'q',
    extractor: (data) => ({
      title: data?.data?.title || data?.title,
      durationSeconds: null,
      quality: '320kbps',
      thumbnail: data?.data?.image || data?.thumbnail,
      downloadUrl: data?.data?.url || data?.url || data?.data?.download,
      mimeType: 'audio/mpeg'
    })
  }
]

async function fetchSpotify(text) {
  let primaryErr

  try {
    return await fetchDlapixy(text)
  } catch (err) {
    primaryErr = err
  }

  for (const api of apisRespaldo) {
    try {
      const { data } = await axios.get(api.url, {
        params: { [api.param]: text },
        timeout: 20000
      })
      const extracted = api.extractor(data)
      if (extracted.downloadUrl) return extracted
    } catch {}
  }

  throw primaryErr
}

async function sendAudio(conn, m, data) {
  const audio = {
    ptt: false,
    fileName: `${data.title || 'cancion'}.mp3`,
    mimetype: data.mimeType || 'audio/mpeg'
  }

  try {
    await conn.sendMessage(
      m.chat,
      { audio: { url: data.downloadUrl }, ...audio },
      { quoted: m }
    )
  } catch {
    const r = await axios.get(data.downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxContentLength: 100 * 1024 * 1024
    })
    await conn.sendMessage(
      m.chat,
      { audio: Buffer.from(r.data), ...audio },
      { quoted: m }
    )
  }
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`✎ Ingresa algún término de búsqueda para buscar tu canción.`)

  await m.react('🕓')

  let stage = 'consulta a la API'

  try {
    const data = await fetchSpotify(text)

    const downloadUrl = data.downloadUrl
    if (!downloadUrl) {
      await m.react('❌')
      return m.reply('No se pudo obtener el enlace de descarga.')
    }

    const duracion = data.durationSeconds 
      ? Math.floor(data.durationSeconds / 60) + ':' + String(data.durationSeconds % 60).padStart(2, '0') 
      : 'Desconocida'

    const info = `Descargando... *${data.title || 'Sin título'}*\n\n` +
                 `> ꕥ Duración › *${duracion}*\n` +
                 `> ✧ Calidad › *${data.quality || 'Desconocida'}*\n` +
                 `> ❀ Fuente › *${text}*`

    stage = 'envío de la portada'

    if (data.thumbnail) {
      try {
        await conn.sendMessage(m.chat, { image: { url: data.thumbnail }, caption: info }, { quoted: m })
      } catch (e) {
        console.log('[spotify] portada:', e.message || e)
        await conn.sendMessage(m.chat, { text: info }, { quoted: m })
      }
    } else {
      await conn.sendMessage(m.chat, { text: info }, { quoted: m })
    }

    stage = 'envío del audio'

    await sendAudio(conn, m, data)

    await m.react('✅')

  } catch (e) {
    console.log(`[spotify] ERROR (${stage}):`, e.message || e)
    await m.react('❌')
    await m.reply(
      `🕷 Ocurrió un error al procesar tu solicitud.\n\n🜸 Etapa: ${stage}\n🜸 Detalles: ${String(e.message || e).slice(0, 300)}`
    )
  }
}

handler.help = ['spotify *<nombre|url>*']
handler.tags = ['downloader']
handler.command = /^(spotify|spdl)$/i
handler.register = true

export default handler
