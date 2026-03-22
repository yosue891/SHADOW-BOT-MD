import fetch from 'node-fetch'
import yts from 'yt-search'

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
    let spotifyURL = text

    if (!text.includes('open.spotify.com')) {
      const search = await yts(text)

      if (!search?.videos?.length) {
        await m.react('❌')
        return conn.reply(m.chat, '🕸️ No encontré ninguna canción con ese nombre.', m)
      }

      const ytUrl = search.videos[0].url

      const convert = await fetch(`https://apiaxi.i11.eu/down/spotify?url=${encodeURIComponent(ytUrl)}`)
      const convertJson = await convert.json()

      if (!convertJson.status || !convertJson.resultado?.url_dl) {
        await m.react('❌')
        return conn.reply(m.chat, '🕸️ No pude convertir esa canción.', m)
      }

      spotifyURL = ytUrl
    }

    const response = await fetch(`https://apiaxi.i11.eu/down/spotify?url=${encodeURIComponent(spotifyURL)}`)
    const result = await response.json()

    if (result.status) {
      const { titulo, miniatura, url_dl } = result.resultado

      const mensaje = `🎵 *Título:* ${titulo}\n🌑 Refinado en las sombras`

      await conn.sendFile(m.chat, miniatura, 'cover.jpg', mensaje, m)

      await conn.sendMessage(
        m.chat,
        { audio: { url: url_dl }, mimetype: 'audio/mpeg' },
        { quoted: m }
      )

      await m.react('✅')
    } else {
      await m.react('❌')
      conn.reply(m.chat, '🕸️ No se pudo obtener la música desde las sombras.', m)
    }

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
