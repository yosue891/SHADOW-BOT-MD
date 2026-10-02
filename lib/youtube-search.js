const YOUTUBE_SEARCH_API = "https://api.lempi.lat/s/youtube"
const YOUTUBE_SEARCH_API_KEY = "YosueShadow123"

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function normalizeVideo(video) {
  if (!video?.url && !video?.id) return null
  const id = video.id || String(video.url).match(/[?&]v=([^&]+)/)?.[1]
  return {
    ...video,
    id,
    videoId: id,
    title: decodeHtml(video.title || "Desconocido"),
    author: { name: decodeHtml(video.channel || video.author?.name || "Desconocido") },
    timestamp: video.duration || "Desconocida",
    views: video.views || "0",
    ago: video.published || "",
    url: video.url || `https://www.youtube.com/watch?v=${id}`,
    thumbnail: video.thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "")
  }
}

export async function searchYouTube(query) {
  const url = `${YOUTUBE_SEARCH_API}?query=${encodeURIComponent(query)}&apikey=${encodeURIComponent(YOUTUBE_SEARCH_API_KEY)}`
  const response = await fetch(url, { headers: { "User-Agent": "Shadow-Bot-MD" } })
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al buscar en YouTube`)

  const data = await response.json()
  const videos = data?.datos?.results?.videos || []
  return { ...data, videos: videos.map(normalizeVideo).filter(Boolean) }
}

export async function firstYouTubeResult(query) {
  const result = await searchYouTube(query)
  return result.videos[0] || null
}
