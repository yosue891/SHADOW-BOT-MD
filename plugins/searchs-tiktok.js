import axios from 'axios'

const NYX_BASE = 'https://nyxdlapi.vercel.app'
const NYX_SEARCH_URL = `${NYX_BASE}/api/search/tiktoksearch`
const NYX_API_KEY = 'nyx_shadow'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda o un enlace de TikTok.', m)
  }

  const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text)

  function toAbsolute(u) {
    if (!u || typeof u !== 'string') return null
    const s = u.trim()
    if (!s) return null
    let abs = null
    if (/^https?:\/\//i.test(s)) abs = s
    else if (s.startsWith('//')) abs = `https:${s}`
    else if (s.startsWith('/')) abs = `${NYX_BASE}${s}`
    if (!abs) return null
    if (abs.startsWith(NYX_BASE) && !abs.includes('apikey=')) {
      abs += `${abs.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(NYX_API_KEY)}`
    }
    return abs
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  try {
    if (m.react) await m.react('🕒')

    if (isUrl) {
      const res = await axios.get(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`,
        { timeout: 20000 }
      )

      const data = res.data?.data
      if (!data?.play && !data?.images) {
        if (m.react) await m.react('✖️')
        return conn.reply(m.chat, 'ꕥ Enlace inválido o sin contenido descargable.', m)
      }

      const { title, duration, author, created_at, type, images, music, play } = data

      const caption = `✐ Título » ${title || 'Contenido TikTok'}
ⴵ Autor » ${author?.nickname || author?.unique_id || 'No disponible'}
✰ Duración » ${duration ?? 'No disponible'} segundos
❒ Fecha » ${created_at ?? 'No disponible'}`

      if (type === 'image' && Array.isArray(images) && images.length) {
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

      if (play) {
        await conn.sendMessage(
          m.chat,
          {
            video: { url: play },
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

    await conn.reply(m.chat, '✧ *ENVIANDO SUS RESULTADOS..*', m)

    const res = await axios.get(NYX_SEARCH_URL, {
      params: { q: text, apikey: NYX_API_KEY },
      timeout: 30000,
      headers: { Accept: 'application/json' }
    })

    const data = res.data
    const list = data?.result?.results || data?.result?.resultados || data?.results || []

    const results = (Array.isArray(list) ? list : [])
      .map(v => ({ ...v, play: toAbsolute(v.video || v.videoWatermarked) }))
      .filter(v => v.play)

    if (results.length < 2) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ Se requieren al menos 2 resultados válidos con contenido.', m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 7)

    const album = topResults.map(v => {
      const title = v.title || 'Video TikTok'
      const author = v.author?.name || v.author?.username || v.author?.nickname || v.author?.unique_id || 'Desconocido'
      const duration = v.duration ?? 'No disponible'

      return {
        video: { url: v.play },
        caption: `✧ RESULTADO DE: ${text}\n\n✐ ${title}\nⴵ Autor » ${author}\n✰ Duración » ${duration} segundos\n\nTikTok Search`
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
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}`,
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
