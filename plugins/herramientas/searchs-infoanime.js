import fetch from 'node-fetch'

var handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) return conn.reply(m.chat, `🌑 *Discípulo de las Sombras*\nDebes entregar el nombre de un anime o manga para revelar su información.`, m)

  try {
    await m.react('🎭') 
    let res = await fetch('https://api.jikan.moe/v4/manga?q=' + text)
    if (!res.ok) {
      await m.react('✖️')
      return conn.reply(m.chat, `⚠️ El ritual falló...\n> Usa *${usedPrefix}report* para informarlo.`, m)
    }

    let json = await res.json()
    let data = json.data[0]

    let {
      chapters,
      title_japanese,
      url,
      type,
      score,
      members,
      background,
      status,
      volumes,
      synopsis,
      favorites
    } = data

    let author = data.authors?.[0]?.name || 'No especificado'

    // Traducción automática al español si viene en inglés
    const traducir = async (txt) => {
      if (!txt) return 'No especificado'
      try {
        let tr = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=en|es`)
        let trjson = await tr.json()
        return trjson.responseData.translatedText || txt
      } catch {
        return txt
      }
    }

    synopsis = await traducir(synopsis)
    background = await traducir(background)

    let animeinfo = `🌑 *Catálogo de las Sombras*
    
❖ *Título:* ${title_japanese}
❖ *Capítulos:* ${chapters}
❖ *Tipo:* ${type}
❖ *Estado:* ${status}
❖ *Volúmenes:* ${volumes}
❖ *Favoritos:* ${favorites}
❖ *Puntaje:* ${score}
❖ *Miembros:* ${members}
❖ *Autor:* ${author}
❖ *Contexto:* ${background}
❖ *Sinopsis:* ${synopsis}
❖ *Enlace:* ${url}

🜁 *La información ha sido extraída desde los archivos ocultos del Reino de las Sombras.*`

    await conn.sendFile(
      m.chat,
      data.images.jpg.image_url,
      'shadow_manga.jpg',
      animeinfo,
      m
    )

    await m.react('✔️')

  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `⚠️ El ritual falló...\n> Usa *${usedPrefix}report* para informarlo.\n\n${error.message}`,
      m
    )
  }
}

handler.help = ['infoanime']
handler.tags = ['search']
handler.command = ['infoanime']
handler.group = true

export default handler
