import fetch from 'node-fetch'
import axios from 'axios'

const DLAPIXY_SPOTIFY = 'https://dlapixy.vercel.app/api/downloads/spotify'

async function fetchSpotify(text) {
  let lastErr

  try {
    const res = await fetch(DLAPIXY_SPOTIFY, {
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
          durationSeconds: data.durationSeconds,
          quality: file.quality || '320kbps',
          thumbnail: data.thumbnail,
          downloadUrl: file.url,
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

  for (const api of apisRespaldo) {
    try {
      const { data } = await axios.get(api.url, {
        params: { [api.param]: text },
        timeout: 30000
      })
      const extracted = api.extractor(data)
      if (extracted.downloadUrl) return extracted
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr || new Error('No se pudo obtener resultados de ninguna API.')
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) return m.reply(`✎ Ingresa algún término de búsqueda para buscar tu canción.`)

  await m.react('🕓')

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
                 `> ❀︎ Fuente › *${text}*`

    if (data.thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: data.thumbnail }, caption: info }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: info }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      audio: { url: downloadUrl },
      ptt: false,
      fileName: `${data.title || 'cancion'}.mp3`,
      mimetype: data.mimeType || 'audio/mpeg'
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.log('[spotify] ERROR:', e.message || e)
    await m.react('❌')
    await m.reply('🕷️ Ocurrió un error al procesar tu solicitud.')
  }
}

handler.help = ['spotify *<nombre|url>*']
handler.tags = ['downloader']
handler.command = /^(spotify|spdl)$/i
handler.register = true

export default handler
