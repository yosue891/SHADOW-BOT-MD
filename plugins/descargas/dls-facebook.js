import fetch from 'node-fetch'

const ORBITX_FB_URL = 'https://api.orbitxspace.com/facebook'
const ORBITX_API_KEY = 'Miku_michigely'

const handler = async (m, { args, text, conn }) => {
  try {
    const rawUrl = (args[0] || text || '').trim()
    if (!rawUrl) {
      return conn.reply(
        m.chat,
        '「✦」Por favor, proporciona un enlace válido de Facebook.',
        m
      )
    }

    if (m.react) await m.react('🕒')

    let videoUrl = null
    let titulo = 'Video de Facebook'
    let duracion = ''

    // 1. Proveedor Principal: OrbitX Space API
    try {
      const res = await fetch(ORBITX_FB_URL, {
        method: 'POST',
        headers: {
          'apikey': ORBITX_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: rawUrl }),
        signal: AbortSignal.timeout(30000)
      })

      const json = await res.json()
      if (json?.status && json?.result) {
        const r = json.result
        titulo = r.title || titulo
        duracion = r.duration ? `\n⏱️ *Duración:* ${r.duration}s` : ''
        const media = r.media || {}
        const candidate = media.video_hd || media.video_sd || media.video || r.video || r.url
        if (candidate && typeof candidate === 'string' && candidate.startsWith('http') && !candidate.endsWith('.js')) {
          videoUrl = candidate
        }
      }
    } catch (errOrbitx) {
      console.warn('[ORBITX FB ERROR]:', errOrbitx?.message || errOrbitx)
    }

    // 2. Respaldo secundario: Alyacore Facebook API
    if (!videoUrl) {
      try {
        const alyaRes = await fetch(
          `https://api.alyacore.xyz/dl/facebook?url=${encodeURIComponent(rawUrl)}&key=Miku_michi`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(20000)
          }
        )
        const aData = await alyaRes.json()
        if (aData?.status && Array.isArray(aData?.resultados)) {
          const hd = aData.resultados.find(v => v.quality?.includes('HD') && v.url && v.url !== '/')
          const sd = aData.resultados.find(v => v.url && v.url !== '/')
          videoUrl = hd?.url || sd?.url || null
        }
      } catch (errAlya) {
        console.warn('[ALYACORE FB FALLBACK ERROR]:', errAlya?.message || errAlya)
      }
    }

    if (!videoUrl) {
      if (m.react) await m.react('✖️')
      return conn.reply(
        m.chat,
        'No se pudo obtener el enlace de descarga del video. El servidor no devolvió ningún video.',
        m
      )
    }

    let txt = `*✦ Descarga de Facebook ✦*\n\n`
    txt += `📝 *Título:* ${titulo}${duracion}\n\n`
    txt += `> ✩ Aquí tienes tu pedido.`

    try {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption: txt,
          mimetype: 'video/mp4',
          fileName: 'facebook.mp4'
        },
        { quoted: m }
      )
    } catch (sendErr) {
      console.warn('[FB SEND VIDEO BY URL FAILED, PROBANDO CON conn.sendFile]:', sendErr?.message)
      await conn.sendFile(
        m.chat,
        videoUrl,
        'facebook.mp4',
        txt,
        m
      )
    }

    if (m.react) await m.react('✔️')

  } catch (error) {
    console.error('Facebook API Error:', error.message)
    if (m.react) await m.react('✖️')
    await m.reply(`Error: ${error.message}`)
  }
}

handler.command = ['facebook', 'fb']
handler.tags = ['descargas']
handler.help = ['facebook <url>', 'fb <url>']

export default handler

