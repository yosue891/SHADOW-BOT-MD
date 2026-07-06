import fetch from 'node-fetch'

var handler = async (m, { conn, text, args, usedPrefix }) => {
  if (!text) return m.reply(`✩ Por favor, proporciona el término de búsqueda que deseas realizar a *Google*.\n\nEjemplo: ${usedPrefix}google gatos curiosos`)

  await m.react('🕒')

  const apiUrl = `${global.APIs.delirius.url}/search/googlesearch?query=${encodeURIComponent(text)}`
  const maxResults = Number(args[1]) || 3

  try {
    const response = await fetch(apiUrl)
    if (!response.ok) throw new Error('No se pudo conectar con la API')

    const result = await response.json()
    if (!result.status || !Array.isArray(result.data) || !result.data.length) {
      await m.react('✖️')
      return conn.sendMessage(m.chat, { text: 'ꕥ No se encontraron resultados para esa búsqueda.', ...rcanal }, { quoted: m })
    }

    let replyMessage = `「ᜊ」Resultados de búsqueda para *<${text}>*\n\n`
    result.data.slice(0, maxResults).forEach((item, index) => {
      replyMessage += `> ✐ Título » *${index + 1}. ${item.title || 'Sin título'}*\n`
      replyMessage += `> ⴵ Descripción » ${item.description ? `*${item.description}*` : '_Sin descripción_'}\n`
      replyMessage += `> 🜸 Link » ${item.url || '_Sin url_'}\n\n`
    })

    await conn.sendMessage(m.chat, { text: replyMessage.trim(), ...rcanal }, { quoted: m })
    await m.react('✔️')
  } catch (error) {
    await m.react('✖️')
    await conn.sendMessage(m.chat, { text: `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${error.message}`, ...rcanal }, { quoted: m })
  }
}

handler.help = ['search']
handler.tags = ['search']
handler.command = ['search', 'google']
handler.group = true
//handler.coin = 15

export default handler
