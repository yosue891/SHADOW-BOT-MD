import fetch from 'node-fetch'

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `🌕⚔️ Ingresa el nombre o enlace para invocar música desde *Spotify*.\n\n` + 
      `Ejemplo:\n> *${usedPrefix + command}* shape of you\n> *${usedPrefix + command}* https://open.spotify.com/track/123456789`,
      m
    )
  }

  await m.react('🕓')

  try {
    let spotifyURL = text

    // Si no es enlace, buscar por nombre
    if (!text.includes('open.spotify.com')) {
      const search = await fetch(`https://api-adonix.ultraplus.click/search/spotify?apikey=SHADOWBOTMDKEY&query=${encodeURIComponent(text)}`)
      const searchJson = await search.json()

      if (!searchJson.success || !searchJson.results || !searchJson.results[0]) {
        await m.react('❌')
        return conn.reply(m.chat, '🕸️ No encontré ninguna canción con ese nombre.', m)
      }

      spotifyURL = searchJson.results[0].url
    }

    // Descargar música
    const response = await fetch(`https://api-adonix.ultraplus.click/download/spotify?apikey=SHADOWBOTMDKEY&url=${encodeURIComponent(spotifyURL)}`)
    const result = await response.json()

    if (result.success) {
      const { title, thumbnail, downloadLink } = result
      const mensaje = `🎵 *Título:* ${title}\n🌑 Refinado en las sombras`

      await conn.sendFile(m.chat, thumbnail, 'cover.jpg', mensaje, m)
      await conn.sendMessage(m.chat, { audio: { url: downloadLink }, mimetype: 'audio/mpeg' }, { quoted: m })
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
