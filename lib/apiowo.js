export const APIOWO_BASE = "https://apiowo.vercel.app"
export const APIOWO_TOKEN = "owner_80a9012df01c86f611910967a547f74c185cf39848f10e09"

function cleanName(name) {
  const cleaned = String(name || "media").replace(/[^\w\s._-]/gi, "").trim()
  return (cleaned || "media").substring(0, 70)
}

/**
 * Descarga audio o video de YouTube usando la API de APIOWO (ES-DEATH.API)
 * @param {string} url - URL de YouTube
 * @param {'audio'|'video'|'mp3'|'mp4'} type - Tipo de medio a descargar
 * @returns {Promise<{download: string, title: string, quality: string, mimetype: string}>}
 */
export async function downloadYouTube(url, type = "audio") {
  const targetType = type === "mp3" || type === "audio" ? "audio" : "video"
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": APIOWO_TOKEN,
    "Authorization": `Bearer ${APIOWO_TOKEN}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  }

  // 1. Intentar endpoint principal POST /api/youtube
  try {
    const res = await fetch(`${APIOWO_BASE}/api/youtube`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, type: targetType })
    })
    if (res.ok) {
      const data = await res.json()
      const dlUrl = data?.url || data?.download_url || data?.cdn?.url
      if (data?.success && dlUrl) {
        return {
          download: dlUrl,
          title: cleanName(data.title || "media"),
          quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
          mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
        }
      }
    }
  } catch (errPost) {
    console.warn(`[APIOWO POST /api/youtube error (${targetType})]:`, errPost?.message || errPost)
  }

  // 2. Fallback por GET a /api/youtube
  try {
    const getUrl = `${APIOWO_BASE}/api/youtube?url=${encodeURIComponent(url)}&type=${targetType}`
    const res = await fetch(getUrl, {
      method: "GET",
      headers
    })
    if (res.ok) {
      const data = await res.json()
      const dlUrl = data?.url || data?.download_url || data?.cdn?.url
      if (data?.success && dlUrl) {
        return {
          download: dlUrl,
          title: cleanName(data.title || "media"),
          quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
          mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
        }
      }
    }
  } catch (errGet) {
    console.warn(`[APIOWO GET /api/youtube error (${targetType})]:`, errGet?.message || errGet)
  }

  // 3. Fallback a /api/v1/fetch
  try {
    const res = await fetch(`${APIOWO_BASE}/api/v1/fetch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, type: targetType })
    })
    if (res.ok) {
      const data = await res.json()
      const dlUrl = data?.url || data?.download_url || data?.cdn?.url
      if ((data?.success || data?.ok) && dlUrl) {
        return {
          download: dlUrl,
          title: cleanName(data.title || "media"),
          quality: data.quality || (targetType === "audio" ? "128kbps" : "480p"),
          mimetype: data.mimetype || (targetType === "audio" ? "audio/mpeg" : "video/mp4")
        }
      }
    }
  } catch (errFetch) {
    console.warn(`[APIOWO POST /api/v1/fetch error (${targetType})]:`, errFetch?.message || errFetch)
  }

  throw new Error(`La API de descarga (apiowo.vercel.app) no pudo procesar el enlace (${targetType}).`)
}
