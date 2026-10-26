import yts from "yt-search"
import { APIOWO_BASE, APIOWO_TOKEN } from "./apiowo.js"

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function normalizeVideo(video) {
  if (!video?.url && !video?.id && !video?.videoId) return null
  const id = video.videoId || video.id || String(video.url).match(/[?&]v=([^&]+)/)?.[1]
  return {
    ...video,
    id,
    videoId: id,
    title: decodeHtml(video.title || "Desconocido"),
    author: { name: decodeHtml(video.author?.name || video.channel || video.author || "Desconocido") },
    timestamp: video.duration?.timestamp || video.timestamp || video.duration || "Desconocida",
    views: video.views || "0",
    ago: video.published || video.ago || "",
    url: video.url || `https://www.youtube.com/watch?v=${id}`,
    thumbnail: video.thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "")
  }
}

/**
 * Busca videos en YouTube utilizando yt-search y fallback a APIOWO
 * @param {string} query
 * @returns {Promise<{videos: Array}>}
 */
export async function searchYouTube(query) {
  if (!query || typeof query !== "string") return { videos: [] }
  const cleanQ = query.trim()

  // 1. Método principal: yt-search (rápido, sin dependencias de dominios caídos, metadata completa)
  try {
    const res = await yts(cleanQ)
    const videos = (res?.videos || []).map(normalizeVideo).filter(Boolean)
    if (videos.length > 0) {
      return { videos }
    }
  } catch (errYts) {
    console.warn("[YOUTUBE-SEARCH] yt-search falló, probando APIOWO:", errYts?.message || errYts)
  }

  // 2. Método de respaldo: APIOWO (/api/youtube/search)
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": APIOWO_TOKEN,
        "Authorization": `Bearer ${APIOWO_TOKEN}`,
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ q: cleanQ })
    })
    if (res.ok) {
      const data = await res.json()
      const items = data?.items || []
      const videos = items.map((v) => normalizeVideo({
        id: v.id,
        videoId: v.id,
        title: v.title,
        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnail,
        author: { name: "YouTube" },
        timestamp: "Desconocida",
        views: 0
      })).filter(Boolean)

      if (videos.length > 0) {
        return { videos }
      }
    }
  } catch (errApiOwo) {
    console.warn("[YOUTUBE-SEARCH] APIOWO search falló:", errApiOwo?.message || errApiOwo)
  }

  return { videos: [] }
}

export async function firstYouTubeResult(query) {
  const result = await searchYouTube(query)
  return result?.videos?.[0] || null
}
