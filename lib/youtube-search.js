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

async function getVideoInfoFromOembed(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000)
    })
    if (res.ok) {
      const data = await res.json()
      return {
        id: videoId,
        videoId,
        title: data.title || "Video de YouTube",
        author: { name: data.author_name || "YouTube" },
        timestamp: "Desconocida",
        views: "0",
        ago: "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  } catch (err) {
    console.warn("[YOUTUBE-SEARCH] oEmbed falló:", err?.message)
  }
  return null
}

async function scrapeYouTubeSearch(query) {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8"
      },
      signal: AbortSignal.timeout(7000)
    })
    if (!res.ok) return []
    const html = await res.text()
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/)
    if (!match) return []
    const data = JSON.parse(match[1])
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || []
    const videos = []
    for (const c of contents) {
      const v = c.videoRenderer
      if (!v || !v.videoId) continue
      videos.push(normalizeVideo({
        id: v.videoId,
        videoId: v.videoId,
        title: v.title?.runs?.[0]?.text,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        author: { name: v.ownerText?.runs?.[0]?.text || "YouTube" },
        timestamp: v.lengthText?.simpleText || "Desconocida",
        views: v.viewCountText?.simpleText || "0"
      }))
    }
    return videos.filter(Boolean)
  } catch (errScrape) {
    console.warn("[YOUTUBE-SEARCH] Scrape directo falló:", errScrape?.message)
    return []
  }
}

/**
 * Busca videos en YouTube utilizando un motor de 5 capas de alta resiliencia
 * @param {string} query
 * @returns {Promise<{videos: Array}>}
 */
export async function searchYouTube(query) {
  if (!query || typeof query !== "string") return { videos: [] }
  const cleanQ = query.trim()

  // 1. Si el query es un enlace directo de YouTube, extraer el videoId
  const urlMatch = cleanQ.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i)
  if (urlMatch) {
    const videoId = urlMatch[1]

    // Intentar con oEmbed oficial de YouTube (rápido y no bloquea IPs)
    const oembedVideo = await getVideoInfoFromOembed(videoId)
    if (oembedVideo) {
      return { videos: [oembedVideo] }
    }

    // Intentar con yt-search por videoId
    try {
      const videoById = await yts({ videoId })
      if (videoById && (videoById.title || videoById.videoId)) {
        const normalized = normalizeVideo(videoById)
        if (normalized) return { videos: [normalized] }
      }
    } catch {}

    // Fallback garantizado con solo ID
    return {
      videos: [{
        id: videoId,
        videoId,
        title: "Video de YouTube",
        author: { name: "YouTube" },
        timestamp: "Desconocida",
        views: "0",
        ago: "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      }]
    }
  }

  // 2. Método principal: yt-search
  try {
    const res = await yts(cleanQ)
    const videos = (res?.videos || []).map(normalizeVideo).filter(Boolean)
    if (videos.length > 0) {
      return { videos }
    }
  } catch (errYts) {
    console.warn("[YOUTUBE-SEARCH] yt-search falló, probando scrapers y APIs:", errYts?.message || errYts)
  }

  // 3. Método de respaldo B: Scraper directo HTML de YouTube (no requiere API keys)
  const scrapedVideos = await scrapeYouTubeSearch(cleanQ)
  if (scrapedVideos.length > 0) {
    return { videos: scrapedVideos }
  }

  // 4. Método de respaldo C: APIOWO POST (/api/youtube/search)
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": APIOWO_TOKEN,
        "Authorization": `Bearer ${APIOWO_TOKEN}`,
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ q: cleanQ }),
      signal: AbortSignal.timeout(8000)
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
    console.warn("[YOUTUBE-SEARCH] APIOWO POST search falló:", errApiOwo?.message || errApiOwo)
  }

  // 5. Método de respaldo D: APIOWO GET (/api/youtube/search?q=...)
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube/search?q=${encodeURIComponent(cleanQ)}`, {
      method: "GET",
      headers: {
        "x-api-key": APIOWO_TOKEN,
        "Authorization": `Bearer ${APIOWO_TOKEN}`,
        "User-Agent": "Mozilla/5.0"
      },
      signal: AbortSignal.timeout(8000)
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
  } catch (errGetSearch) {
    console.warn("[YOUTUBE-SEARCH] APIOWO GET search falló:", errGetSearch?.message || errGetSearch)
  }

  return { videos: [] }
}

export async function firstYouTubeResult(query) {
  const result = await searchYouTube(query)
  return result?.videos?.[0] || null
}
