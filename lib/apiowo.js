export const ORBITX_BASE = "https://api.orbitxspace.com"
export const ORBITX_KEY = "Miku_michigely"

export const APIOWO_BASE = "https://apiowo.vercel.app"
export const APIOWO_TOKEN = "owner_80a9012df01c86f611910967a547f74c185cf39848f10e09"
const GOHAN_API_BASE = "https://api-gohan-v1.onrender.com"

function cleanName(name) {
  const cleaned = String(name || "media").replace(/[^\w\s._-]/gi, "").trim()
  return (cleaned || "media").substring(0, 70)
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractVideoId(url) {
  const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i)
  return match?.[1] || null
}

/**
 * Descarga audio o video de YouTube con alta resiliencia y cascada multi-servidor:
 * 1. ORBITX POST /youtube-mp3 (principal para audio)
 * 2. APIOWO POST (upload: false)
 * 3. APIOWO GET (upload: false)
 * 4. APIOWO POST (upload: true)
 * 5. Gohan API Render (ytvideo / ytaudio)
 * 6. APIOWO POST /api/v1/fetch
 * 
 * @param {string} url - URL de YouTube
 * @param {'audio'|'video'|'mp3'|'mp4'} type - Tipo de medio a descargar
 * @returns {Promise<{download: string, download_url: string, url: string, title: string, thumbnail: string, videoId: string, quality: string, mimetype: string}>}
 */
export async function downloadYouTube(url, type = "audio") {
  const targetType = type === "mp3" || type === "audio" ? "audio" : "video"

  // 1. Método principal para AUDIO y VIDEO: OrbitX Space API
  if (targetType === "audio" || targetType === "video") {
    try {
      const res = await fetch(`${ORBITX_BASE}/youtube-mp3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ORBITX_KEY
        },
        body: JSON.stringify({
          url,
          format: targetType === "audio" ? "mp3" : undefined
        }),
        signal: AbortSignal.timeout(30000)
      })
      const text = await res.text()
      const data = safeJson(text)

      if (targetType === "audio" && data?.status && data?.result?.media) {
        const vidId = extractVideoId(url)
        const cover = data.result.cover || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "")
        return {
          download: data.result.media,
          download_url: data.result.media,
          url: data.result.media,
          title: cleanName(data.result.title || "audio"),
          thumbnail: cover,
          videoId: vidId || "",
          quality: data.result.quality || "Audio HQ",
          mimetype: "audio/mpeg"
        }
      }

      if (targetType === "video" && data?.status) {
        const raw = data?.result?.raw?.result
        let videoUrl = raw?.previewUrl
        if (!videoUrl && raw?.resolvedMediaJson) {
          try {
            const parsed = JSON.parse(raw.resolvedMediaJson)
            if (Array.isArray(parsed?.tunnel) && parsed.tunnel.length > 0) {
              videoUrl = parsed.tunnel[0]
            }
          } catch {}
        }

        if (videoUrl) {
          const vidId = extractVideoId(url)
          return {
            download: videoUrl,
            download_url: videoUrl,
            url: videoUrl,
            title: cleanName(data?.result?.title || raw?.title || "video"),
            thumbnail: raw?.thumbnailUrl || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : ""),
            videoId: vidId || "",
            quality: "720p",
            mimetype: "video/mp4"
          }
        }
      }
    } catch (errOrbitx) {
      console.warn(`[ORBITX POST /youtube-mp3 error (${targetType})]:`, errOrbitx?.message || errOrbitx)
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": APIOWO_TOKEN,
    "Authorization": `Bearer ${APIOWO_TOKEN}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  }

  // 2. Respaldo A: APIOWO POST /api/youtube con upload: false
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        type: targetType,
        upload: false
      }),
      signal: AbortSignal.timeout(12000)
    })
    const text = await res.text()
    const data = safeJson(text)
    const dlUrl = data?.url || data?.download_url || data?.cdn?.url
    if (data?.success && dlUrl) {
      return {
        download: dlUrl,
        download_url: dlUrl,
        url: dlUrl,
        title: cleanName(data.title || "media"),
        thumbnail: data.thumbnail || "",
        videoId: data.videoId || "",
        quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
        mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
      }
    }
  } catch (errPost) {
    console.warn(`[APIOWO POST /api/youtube error (${targetType})]:`, errPost?.message || errPost)
  }

  // 3. Respaldo B: APIOWO GET /api/youtube con upload: false
  try {
    const getUrl = `${APIOWO_BASE}/api/youtube?url=${encodeURIComponent(url)}&type=${targetType}&upload=false`
    const res = await fetch(getUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(12000)
    })
    const text = await res.text()
    const data = safeJson(text)
    const dlUrl = data?.url || data?.download_url || data?.cdn?.url
    if (data?.success && dlUrl) {
      return {
        download: dlUrl,
        download_url: dlUrl,
        url: dlUrl,
        title: cleanName(data.title || "media"),
        thumbnail: data.thumbnail || "",
        videoId: data.videoId || "",
        quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
        mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
      }
    }
  } catch (errGet) {
    console.warn(`[APIOWO GET /api/youtube error (${targetType})]:`, errGet?.message || errGet)
  }

  // 4. Respaldo C: APIOWO POST con upload: true (re-upload CDN)
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        type: targetType,
        upload: true
      }),
      signal: AbortSignal.timeout(15000)
    })
    const text = await res.text()
    const data = safeJson(text)
    const dlUrl = data?.url || data?.download_url || data?.cdn?.url
    if (data?.success && dlUrl) {
      return {
        download: dlUrl,
        download_url: dlUrl,
        url: dlUrl,
        title: cleanName(data.title || "media"),
        thumbnail: data.thumbnail || "",
        videoId: data.videoId || "",
        quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
        mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
      }
    }
  } catch (errUploadTrue) {
    console.warn(`[APIOWO POST upload:true error (${targetType})]:`, errUploadTrue?.message || errUploadTrue)
  }

  // 5. Respaldo D: API Gohan (savetube backend para video y audio)
  try {
    const gohanEndpoint = targetType === "audio" ? "ytaudio" : "ytvideo"
    const res = await fetch(`${GOHAN_API_BASE}/download/${gohanEndpoint}?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(18000)
    })
    const text = await res.text()
    const data = safeJson(text)
    const dlUrl = data?.result?.download_url || data?.download_url
    if (data?.status && dlUrl) {
      return {
        download: dlUrl,
        download_url: dlUrl,
        url: dlUrl,
        title: cleanName(data.result?.title || data.title || "media"),
        thumbnail: data.result?.thumbnail || data.thumbnail || "",
        videoId: "",
        quality: data.result?.quality || (targetType === "audio" ? "128kbps" : "360p"),
        mimetype: targetType === "audio" ? "audio/mpeg" : "video/mp4"
      }
    }
  } catch (errGohan) {
    console.warn(`[GOHAN API error (${targetType})]:`, errGohan?.message || errGohan)
  }

  // 6. Respaldo E: APIOWO /api/v1/fetch
  try {
    const res = await fetch(`${APIOWO_BASE}/api/v1/fetch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, type: targetType, upload: false }),
      signal: AbortSignal.timeout(12000)
    })
    const text = await res.text()
    const data = safeJson(text)
    const dlUrl = data?.url || data?.download_url || data?.cdn?.url
    if ((data?.success || data?.ok) && dlUrl) {
      return {
        download: dlUrl,
        download_url: dlUrl,
        url: dlUrl,
        title: cleanName(data.title || "media"),
        thumbnail: data.thumbnail || "",
        videoId: data.videoId || "",
        quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
        mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
      }
    }
  } catch (errFetch) {
    console.warn(`[APIOWO POST /api/v1/fetch error (${targetType})]:`, errFetch?.message || errFetch)
  }

  throw new Error(`Los servidores de descarga no pudieron procesar este video (${targetType}). Intenta con otro enlace.`)
}
