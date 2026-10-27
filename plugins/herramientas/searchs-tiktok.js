import axios from 'axios'

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

    // Si es un enlace directo de TikTok
    if (isUrl) {
      let videoUrl = null
      let title = 'Contenido TikTok'
      let author = 'No disponible'
      let duration = 'No disponible'
      let createdAt = 'No disponible'
      let images = []
      let music = null

      // 1. Intentar con APIOWO /api/tiktok
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

      // 2. Respaldo TikWM
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

    // Búsqueda por término (TikTok Search APIOWO)
    await conn.reply(m.chat, '✧ *BUSCANDO EN TIKTOK (APIOWO)...*', m)

    let list = []
    let apiErrorMsg = null

    // 1. Llamada principal GET /api/tiktok/search
    try {
      const res = await axios.get(`${APIOWO_BASE}/api/tiktok/search`, {
        params: { keyword: text, count: 10 },
        headers: {
          'x-api-key': APIOWO_TOKEN,
          'Authorization': `Bearer ${APIOWO_TOKEN}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 25000
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
      } else if (data?.success === false && data?.error) {
        apiErrorMsg = data.error?.message || data.error?.code
      }
    } catch (errGet) {
      console.warn('[APIOWO GET /api/tiktok/search error]:', errGet?.response?.data || errGet?.message)
      const errData = errGet?.response?.data
      if (errData?.error?.message) {
        apiErrorMsg = errData.error.message
      }
    }

    // 2. Si GET falló o no dio resultados, intentar POST
    if (!list.length && !apiErrorMsg) {
      try {
        const postRes = await axios.post(
          `${APIOWO_BASE}/api/tiktok/search`,
          { keyword: text, count: 10 },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': APIOWO_TOKEN,
              'Authorization': `Bearer ${APIOWO_TOKEN}`
            },
            timeout: 25000
          }
        )
        const postData = postRes.data
        if (Array.isArray(postData?.data)) {
          list = postData.data
        } else if (Array.isArray(postData?.result)) {
          list = postData.result
        } else if (Array.isArray(postData?.results)) {
          list = postData.results
        } else if (Array.isArray(postData?.videos)) {
          list = postData.videos
        }
      } catch (errPost) {
        console.warn('[APIOWO POST /api/tiktok/search error]:', errPost?.response?.data || errPost?.message)
      }
    }

    const results = (Array.isArray(list) ? list : [])
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

    if (results.length === 0) {
      if (m.react) await m.react('✖️')
      const extraInfo = apiErrorMsg ? `\n> *Detalle:* ${apiErrorMsg}` : ''
      return conn.reply(m.chat, `ꕥ No se encontraron resultados en TikTok para *${text}*.${extraInfo}`, m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 7)

    const album = topResults.map(v => {
      return {
        video: { url: v.play },
        caption: `✧ RESULTADO DE: ${text}\n\n✐ ${v.title}\nⴵ Autor » ${v.author}\n✰ Duración » ${v.duration} segundos\n\nTikTok Search • APIOWO`
      }
    })

    try {
      await conn.sendMessage(m.chat, { album }, { quoted: m })
    } catch {
      for (const item of album) {
        await conn.sendMessage(m.chat, item, { quoted: m })
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
