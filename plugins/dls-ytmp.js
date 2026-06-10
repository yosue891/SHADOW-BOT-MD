// Código Creado por Ryze echo Scraper echo código por DvWilkerOFC

import yts from 'yt-search'
import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0]) {
      return m.reply('🖤🌑 *SHADOW BOT MD* 🌑🖤\n\n> Por favor, menciona el nombre o URL del video que deseas descargar')
    }

    const input_text = args.join(' ').trim()
    const video_id = getVideoId(input_text)
    const query = video_id ? `https://youtu.be/${video_id}` : input_text

    let url = query
    let title = 'video'
    let thumbnail = null

    try {
      const video_info = await getVideoInfo(query, video_id)

      if (video_info) {
        url = video_info.url || `https://youtu.be/${video_info.videoId}`
        title = video_info.title || title
        thumbnail = video_info.image || video_info.thumbnail || null

        const views = (video_info.views || 0).toLocaleString()
        const channel = video_info.author?.name || video_info.author || 'Desconocido'

        const info_message = `
🖤 *SHADOW BOT MD* 🌑

⚡ *Descargando video...*

> 🖤 Título: *${title}*
> 🌑 Canal: *${channel}*
> 🖤 Duración: *${video_info.timestamp || 'Desconocido'}*
> 🌑 Vistas: *${views}*
> 🖤 Calidad: *${shadow_format}*
> 🌐 Enlace: *${url}*`

        if (thumbnail) {
          await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: info_message
          }, { quoted: m })
        } else {
          await m.reply(info_message)
        }
      }
    } catch {}

    if (!isYTUrl(url)) {
      return m.reply('🖤🌑 *SHADOW BOT MD* 🌑🖤\n\n> No encontré un video válido de YouTube.')
    }

    const video = await getVideoFromShadow(url)

    if (!video?.url) {
      return m.reply('🖤🌑 *SHADOW BOT MD* 🌑🖤\n\n> No se pudo descargar el *video*, intenta más tarde.')
    }

    await conn.sendMessage(m.chat, {
      video: { url: video.url },
      fileName: `${sanitizeFileName(video.title || title)}.mp4`,
      mimetype: 'video/mp4',
      caption: `🖤 *VIDEO DESCARGADO* 🌑

⚡ Calidad: *${video.quality || shadow_format}*
🖤 Tamaño: *${video.size || 'Desconocido'}*

*Shadow Power Activated* 🌑🖤`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    await m.reply(
      `🖤🌑 *SHADOW BOT MD* 🌑🖤\n\n> Error al ejecutar el comando *${usedPrefix + command}*.\n⚡ [Error: *${e.message}*]`
    )
  }
}

handler.command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo', 'shadowplay']
handler.help = ['playvideo']
handler.tags = ['descargas']
handler.register = true

export default handler

// Configuración Shadow Bot
const shadow_api = 'https://ryzecodes.xyz/api/scrapers/36/run'
const shadow_key = 'ryzk0cdn'
const shadow_format = '480p'
const shadow_attempts = 6
const shadow_interval_ms = 1100

const isYTUrl = (url = '') =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

const getVideoId = (text = '') => {
  const match = text.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
  )
  return match?.[1] || null
}

const sanitizeFileName = (name = 'video') =>
  name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'video'

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
  }

  return json
}

async function getVideoInfo(input, video_id) {
  if (video_id) {
    try {
      const info = await yts({ videoId: video_id })
      if (info?.videoId) {
        return {
          ...info,
          url: `https://youtu.be/${info.videoId}`,
          image: info.thumbnail || info.image
        }
      }
    } catch {}
  }

  const search = await yts(input)
  const video = search.videos?.[0] || search.all?.find(v => v.type === 'video')
  return video || null
}

async function getVideoFromShadow(url) {
  const res = await fetchJson(shadow_api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': shadow_key
    },
    body: JSON.stringify({
      input: {
        url,
        format: shadow_format,
        attempts: shadow_attempts,
        interval_ms: shadow_interval_ms
      }
    })
  })

  const result = res?.result

  if (!res?.success || !result?.success) {
    throw new Error(res?.error || result?.error || 'API sin resultado válido')
  }

  const video_url = result.file_url || result.download_urls?.[0] || null
  if (!video_url) return null

  return {
    url: video_url,
    title: result.title || null,
    provider: result.provider || null,
    format: result.format || shadow_format,
    quality: result.selected_media?.quality || result.format || shadow_format,
    extension: result.selected_media?.extension || 'MP4',
    size: result.selected_media?.size || null,
    worker_url: result.diagnostics?.worker_url || null
  }
}