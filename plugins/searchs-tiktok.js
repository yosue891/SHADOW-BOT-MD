import axios from 'axios'

const NYX_BASE = 'https://nyxdlapi.vercel.app'
const NYX_APIKEY = 'nyx_vDSYgjTlKOOLhz-_XmojwHjvH1_hp5c2'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, '✐ Por favor, ingresa un término de búsqueda o un enlace de TikTok.', m)
  }

  const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text)

  async function getVideoBuffer(v) {
    const urls = [v.play, v.direct].filter(Boolean)
    let firstErr
    for (const u of urls) {
      try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36' }
        if (u.startsWith(NYX_BASE)) {
          headers['x-api-key'] = NYX_APIKEY
          headers['apikey'] = NYX_APIKEY
        }
        const r = await axios.get(u, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 100 * 1024 * 1024,
          headers
        })
        return Buffer.from(r.data)
      } catch (err) {
        if (!firstErr) firstErr = err
      }
    }
    throw firstErr
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  const clip = (s, n) => {
    const t = String(s).replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n - 1) + '…' : t
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

    const res = await axios.get(
      `${NYX_BASE}/api/search/tiktoksearch?apikey=${NYX_APIKEY}&query=${encodeURIComponent(text)}`,
      {
        timeout: 20000,
        headers: {
          'x-api-key': NYX_APIKEY,
          'apikey': NYX_APIKEY
        }
      }
    )

    let results = (res.data?.result?.results || [])
      .filter(v => v.video)
      .map(v => {
        const full = /^https?:\/\//i.test(v.video) ? v.video : `${NYX_BASE}${v.video}`
        let direct
        try {
          const token = new URL(full).searchParams.get('token')
          const decoded = token ? Buffer.from(token, 'base64').toString('utf8') : ''
          if (/^https?:\/\//i.test(decoded)) direct = decoded
        } catch {}
        return {
          ...v,
          play: full.includes('apikey=') ? full : `${full}${full.includes('?') ? '&' : '?'}apikey=${NYX_APIKEY}`,
          direct
        }
      })

    if (results.length < 2) {
      if (m.react) await m.react('✖️')
      return conn.reply(m.chat, 'ꕥ Se requieren al menos 2 resultados válidos con contenido.', m)
    }

    shuffleArray(results)
    const topResults = results.slice(0, 7)

    const downloads = await Promise.allSettled(topResults.map(v => getVideoBuffer(v)))
    const videos = []
    downloads.forEach((d, i) => {
      if (d.status === 'fulfilled') videos.push({ buffer: d.value, v: topResults[i] })
    })
    if (!videos.length) throw downloads[0].reason

    const titleOf = v => v.title || 'Video TikTok'
    const authorOf = v => v.author?.name || v.author?.username || 'Desconocido'
    const durationOf = v => v.duration ?? 'No disponible'

    if (videos.length > 1 && typeof conn.sendAlbumMessage === 'function') {
      const list = videos
        .map(({ v }, i) => `${i + 1}. ✐ ${clip(titleOf(v), 50)} | ⴵ ${clip(authorOf(v), 20)} | ✰ ${durationOf(v)}s`)
        .join('\n')
      const albumCaption = `✧ RESULTADO DE: ${text}\n\n${list}`.slice(0, 1000)

      await conn.sendAlbumMessage(
        m.chat,
        videos.map(({ buffer }) => ({ type: 'video', data: buffer })),
        { caption: albumCaption, quoted: m }
      )
    } else {
      for (const { buffer, v } of videos) {
        await conn.sendMessage(
          m.chat,
          {
            video: buffer,
            caption: `✐ ${titleOf(v)}\nⴵ Autor » ${authorOf(v)}\n✰ Duración » ${durationOf(v)} segundos`
          },
          { quoted: m }
        )
      }
    }

    if (m.react) await m.react('✔️')
  } catch (e) {
    if (m.react) await m.react('✖️')
    const failedUrl = String(e.config?.url || e.response?.config?.url || '').replace(/apikey=[^&]+/gi, 'apikey=***')
    await conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n🜸 Detalles: ${e.message}${failedUrl ? `\n🜸 URL: ${failedUrl}` : ''}`,
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
