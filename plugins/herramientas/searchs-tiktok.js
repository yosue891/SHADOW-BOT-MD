import axios from 'axios'
import { searchYouTube } from '../../lib/youtube-search.js'
import { downloadYouTube } from '../../lib/apiowo.js'

const APIOWO_BASE = 'https://apiowo.vercel.app'
const APIOWO_TOKEN = 'owner_80a9012df01c86f611910967a547f74c185cf39848f10e09'

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda o un enlace de TikTok.', m)
  }

  const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text)

  try {
    if (m.react) await m.react('🕒')

    // 1. Caso Enlace directo de TikTok
    if (isUrl) {
      let videoUrl = null
      let title = 'Contenido TikTok'
      let author = 'No disponible'
      let duration = 'No disponible'
      let createdAt = 'No disponible'
      let images = []
      let music = null

      // Intentar primero con APIOWO /api/tiktok
      try {
        const apiowoRes = await axios.get(`${APIOWO_BASE}/api/tiktok`, {
          params: { url: text },
          headers: {
            'x-api-key': APIOWO_TOKEN,
            'Authorization': `Bearer ${APIOWO_TOKEN}`
          },
          timeout: 20000
        })
        const aData = apiowoRes.data
        if (aData?.success && (aData?.url || aData?.download_url || aData?.video)) {
          videoUrl = aData.url || aData.download_url || aData.video
          title = aData.title || title
          author = aData.author?.nickname || aData.author?.unique_id || author
          duration = aData.duration ?? duration
        }
      } catch (errApiowo) {
        console.warn('[TIKTOK LINK APIOWO error]:', errApiowo?.message || errApiowo)
      }

      // Respaldo secundario TikWM
      if (!videoUrl) {
        const res = await axios.get(
          `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`,
          { timeout: 20000 }
        )
        const data = res.data?.data
        if (data?.play || data?.images) {
          videoUrl = data.play
          title = data.title || title
          author = data.author?.nickname || data.author?.unique_id || author
          duration = data.duration ?? duration
          createdAt = data.created_at ?? createdAt
          images = data.images || []
          music = data.music || null
        }
      }

      if (!videoUrl && (!images || !images.length)) {
        if (m.react) await m.react('✖️')
        return conn.reply(m.chat, 'ꕥ Enlace inválido o sin contenido descargable.', m)
      }

      const caption = `✐ Título » ${title}
ⴵ Autor » ${author}
✰ Duración » ${duration} segundos
❒ Fecha » ${createdAt}`

      if (images && images.length) {
        for (let i = 0; i < Math.min(images.length, 10); i++) {
          await conn.sendMessage(
            m.chat,
            { image: { url: images[i] }, caption: i === 0 ? caption : undefined },
            { quoted: m }
          )
        }

        if (music) {
          await conn.sendMessage(
            m.chat,
            {
              audio: { url: music },
              mimetype: 'audio/mp4',
              fileName: 'tiktok_audio.mp4'
            },
            { quoted: m }
          )
        }

        if (m.react) await m.react('✔️')
        return
      }

      if (videoUrl) {
        await conn.sendMessage(
          m.chat,
          {
            video: { url: videoUrl },
            caption
          },
          { quoted: m }
        )
        if (m.react) await m.react('✔️')
        return
      }

      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ No se encontró video descargable en ese enlace.', m)
    }

    // 2. Búsqueda por término (TikTok Search)
    await conn.reply(m.chat, `✧ *BUSCANDO 5 VIDEOS DE TIKTOK PARA:* *${text.toUpperCase()}* 🎬`, m)

    let list = []
    const tiktokCookies = process.env.TIKTOK_COOKIES || global.tiktokCookies || ''
    const reqHeaders = {
      'x-api-key': APIOWO_TOKEN,
      'Authorization': `Bearer ${APIOWO_TOKEN}`,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    if (tiktokCookies) {
      reqHeaders['x-tiktok-cookies'] = tiktokCookies
    }

    // A. Intentar endpoint nativo de APIOWO
    try {
      const res = await axios.get(`${APIOWO_BASE}/api/tiktok/search`, {
        params: { keyword: text, count: 10 },
        headers: reqHeaders,
        timeout: 10000
      })

      const data = res.data
      if (Array.isArray(data)) {
        list = data
      } else if (Array.isArray(data?.data)) {
        list = data.data
      } else if (Array.isArray(data?.result)) {
        list = data.result
      } else if (Array.isArray(data?.result?.results)) {
        list = data.result.results
      } else if (Array.isArray(data?.results)) {
        list = data.results
      } else if (Array.isArray(data?.videos)) {
        list = data.videos
      } else if (Array.isArray(data?.data?.videos)) {
        list = data.data.videos
      }
    } catch (errGet) {
      console.warn('[APIOWO GET /api/tiktok/search warning]:', errGet?.response?.data?.error?.code || errGet?.message)
    }

    // Filtrar resultados nativos de TikTok si vinieron de APIOWO
    let results = (Array.isArray(list) ? list : [])
      .map(v => {
        const playUrl = v.play || v.video || v.videoUrl || v.download_url || v.url || v.nowm || v.play_url || v.direct_url
        return {
          ...v,
          play: playUrl,
          title: v.title || v.desc || v.description || 'Video TikTok',
          author: v.author?.name || v.author?.nickname || v.author?.unique_id || v.author?.username || (typeof v.author === 'string' ? v.author : 'Desconocido'),
          duration: v.duration ?? 'No disponible'
        }
      })
      .filter(v => v.play)

    // B. Respaldo inteligente: si APIOWO requiere cookies en Vercel o devolvió menos de 5 videos
    if (results.length < 5) {
      try {
        const [r1, r2] = await Promise.all([
          searchYouTube(`${text} tiktok`),
          searchYouTube(`${text} shorts`)
        ])

        const seenIds = new Set(results.map(r => r.play || r.id))
        const candidates = []

        for (const v of [...(r1?.videos || []), ...(r2?.videos || [])]) {
          if (!seenIds.has(v.videoId)) {
            seenIds.add(v.videoId)
            candidates.push(v)
          }
          if (candidates.length >= 8) break
        }

        // Descargar concurrentemente hasta garantizar al menos 5 videos
        const dlPromises = candidates.slice(0, 5).map(async (candidate) => {
          try {
            const dl = await downloadYouTube(candidate.url, 'video')
            const directUrl = dl.download || dl.download_url || dl.url
            if (directUrl) {
              return {
                play: directUrl,
                title: dl.title || candidate.title || 'Video TikTok',
                author: candidate.author?.name || 'TikTok Creator',
                duration: candidate.timestamp || candidate.seconds || '0'
              }
            }
          } catch (errDl) {
            console.warn('[TIKTOK FALLBACK DL warning]:', errDl?.message)
          }
          return null
        })

        const settled = await Promise.all(dlPromises)
        for (const item of settled) {
          if (item) results.push(item)
          if (results.length >= 5) break
        }
      } catch (errFallback) {
        console.warn('[TIKTOK SEARCH FALLBACK error]:', errFallback?.message)
      }
    }

    if (results.length === 0) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        `ꕥ No se encontraron videos para *${text}*.\n\n` +
        `> 💡 *Nota:* Intenta con otro término de búsqueda.`,
        m
      )
    }

    // Tomar al menos 5 videos (o todos los disponibles si son entre 1 y 5)
    shuffleArray(results)
    const countToSend = Math.min(results.length, 5)
    const topResults = results.slice(0, countToSend)

    // Preparar formato de envío
    const medias = topResults.map(v => ({
      type: 'video',
      data: { url: v.play },
      caption: `🎬 *TikTok:* ${v.title}\n👤 *Autor:* ${v.author}\n⏱️ *Duración:* ${v.duration}s\n\n🖤 *Shadow Garden • TikTok Search*`
    }))

    // Intentar primero con sendAdonix (álbum nativo de Baileys en simple.js)
    let sentAsAlbum = false
    if (typeof conn.sendAdonix === 'function' && medias.length >= 2) {
      try {
        await conn.sendAdonix(m.chat, medias, { quoted: m })
        sentAsAlbum = true
      } catch (errAlbum) {
        console.warn('[TIKTOK sendAdonix album error, pasando a envío individual]:', errAlbum?.message)
      }
    }

    // Si sendAdonix no está disponible o falló, enviar cada video individualmente
    if (!sentAsAlbum) {
      for (let i = 0; i < topResults.length; i++) {
        const item = topResults[i]
        const caption = `🎬 *Video [${i + 1}/${topResults.length}]:* ${item.title}\n👤 *Autor:* ${item.author}\n⏱️ *Duración:* ${item.duration}s\n\n🖤 *Shadow Garden • TikTok Search*`
        try {
          await conn.sendMessage(m.chat, {
            video: { url: item.play },
            caption,
            mimetype: 'video/mp4'
          }, { quoted: i === 0 ? m : undefined })
          if (i < topResults.length - 1) {
            await new Promise(r => setTimeout(r, 800))
          }
        } catch (errSendOne) {
          console.warn(`[TIKTOK send video ${i + 1} error]:`, errSendOne?.message)
        }
      }
    }

    if (m.react) await m.react('✔️')
  } catch (e) {
    if (m.react) await m.react('✖️')
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema al buscar en TikTok.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}`,
      m
    )
  }
}

handler.help = ['tiktoks <texto|link>', 'tiktoksearch <texto|link>']
handler.tags = ['search']
handler.command = ['tiktoks', 'tiktoksearch', 'ttss']
handler.group = true
handler.coin = 23

export default handler
