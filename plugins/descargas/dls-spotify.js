import axios from 'axios'

const SPOTIFY_API = 'https://dlapixy.vercel.app/api/downloads/spotify'

async function sendAudio(conn, m, file) {
  const mimetype = file.mimeType || 'audio/mpeg'

  try {
    await conn.sendMessage(
      m.chat,
      { audio: { url: file.url }, mimetype },
      { quoted: m }
    )
  } catch {
    const r = await axios.get(file.url, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxContentLength: 100 * 1024 * 1024
    })
    await conn.sendMessage(
      m.chat,
      { audio: Buffer.from(r.data), mimetype },
      { quoted: m }
    )
  }
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `🌕⚔️ Invoca música desde *Spotify*.\n\n` + 
      `Ejemplos:\n> *${usedPrefix + command}* shape of you\n> *${usedPrefix + command}* https://open.spotify.com/track/123456789`,
      m
    )
  }

  await m.react('🕓')

  try {
    const { data: result } = await axios.get(SPOTIFY_API, {
      params: { url: text, q: text, query: text },
      timeout: 60000
    })

    const files = Array.isArray(result?.files) ? result.files : []
    const file = files.find(f => f?.kind === 'audio' && f?.url) || files.find(f => f?.url)

    if (!result?.ok || !file) {
      await m.react('❌')
      return conn.reply(m.chat, '🕸️ No se pudo obtener la música desde las sombras.', m)
    }

    const titulo = result.title || 'Sin título'
    const miniatura = result.thumbnail

    const mensaje = `🎵 *Título:* ${titulo}\n🌑 Refinado en las sombras`

    if (miniatura) {
      try {
        await conn.sendMessage(
          m.chat,
          { image: { url: miniatura }, caption: mensaje },
          { quoted: m }
        )
      } catch (e) {
        console.error('Error enviando la portada:', e)
        await conn.reply(m.chat, mensaje, m)
      }
    } else {
      await conn.reply(m.chat, mensaje, m)
    }

    await sendAudio(conn, m, file)

    await m.react('✅')

  } catch (error) {
    console.error(error)
    await m.react('❌')
    conn.reply(m.chat, '🕷️ El ritual falló... no pude procesar tu solicitud.', m)
  }
}

handler.help = ['spotify *<nombre|url>*']
handler.tags = ['descargas']
handler.command = /^(spotify|spdl)$/i
handler.register = true

export default handler
